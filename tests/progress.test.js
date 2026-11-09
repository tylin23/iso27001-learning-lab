import test from "node:test";
import assert from "node:assert/strict";
import { levels } from "../src/lessons.js";
import { comparisons } from "../src/compare.js";
import { annexThemes, chapters, clauses } from "../src/standard.js";
import {
  buildSummary, chapterOpen, coverageGaps, isSolved, levelOpen, levelPassed, migrateLegacy, newEntry,
  nextLevel, passedClauses, permissions, readProgress, setLabSetting,
} from "../src/progress.js";

test("both identities must be tested after the last settings change", () => {
  const step = levels[0].steps[0];
  const entry = newEntry(step);
  assert.equal(permissions("public", "guest"), true);
  assert.equal(permissions("closed", "staff"), false);
  entry.tested.guest = true;
  setLabSetting(entry, "team");
  assert.deepEqual(entry.tested, { guest: false, staff: false });
  assert.equal(permissions("team", "guest"), false);
  assert.equal(permissions("team", "staff"), true);
  entry.tested.staff = true;
  assert.equal(isSolved(step, entry), false);
  entry.tested.guest = true;
  assert.equal(isSolved(step, entry), true);
  setLabSetting(entry, "closed");
  assert.equal(isSolved(step, entry), false);
});

test("unfinished selections survive reload and do not unlock the next level", () => {
  const saved = readProgress('{"access":[{"setting":"team","role":"staff","tested":{"staff":true}},{"choice":2,"incorrect":true}]}');
  assert.equal(saved.access[0].role, "staff");
  assert.equal(saved.access[0].tested.staff, true);
  assert.equal(saved.access[1].choice, 2);
  assert.equal(nextLevel(saved).id, "access");
  assert.doesNotMatch(buildSummary(saved), /只有機密性/);
});

test("a completed first level unlocks the next and includes verified records in the summary", () => {
  const saved = readProgress('{"access":[{"setting":"team","tested":{"staff":true,"guest":true}},{"choice":0}]}');
  assert.equal(nextLevel(saved).id, "c4_1");
  const summary = buildSummary(saved);
  assert.match(summary, /已驗證外部訪客無法查看/);
  assert.match(summary, /機密性與可用性/);
  assert.doesNotMatch(summary, /適用性聲明/);
});

test("bad or unexpected stored data cannot stop the site from loading", () => {
  assert.deepEqual(readProgress("{"), {});
  assert.deepEqual(readProgress("null"), {});
  const saved = readProgress('{"access":[{"setting":"unknown","role":"unknown","tested":{"guest":"yes"}},{"choice":999}],"unknown":[]}');
  assert.deepEqual(saved.access[0], newEntry(levels[0].steps[0]));
  assert.equal(saved.access[1].choice, null);
  assert.equal(nextLevel(saved).id, "access");
});

test("all levels can be completed in sequence and survive serialization", () => {
  const progress = {};
  for (const level of levels) {
    assert.equal(nextLevel(progress)?.id, level.id);
    progress[level.id] = level.steps.map((step) => {
      const entry = newEntry(step);
      if (step.type === "lab") {
        setLabSetting(entry, "team");
        entry.tested = { guest: true, staff: true };
      } else {
        assert.equal(step.options.filter(([, correct]) => correct).length, 1);
        entry.choice = step.options.findIndex(([, correct]) => correct);
      }
      return entry;
    });
  }
  const restored = readProgress(JSON.stringify(progress));
  assert.equal(nextLevel(restored), undefined);
  const summary = buildSummary(restored);
  for (const level of levels) {
    for (const step of level.steps) assert.ok(summary.includes(step.record), step.record);
  }
});

const solve = (level) => level.steps.map((step) => {
  const entry = newEntry(step);
  if (step.type === "lab") {
    setLabSetting(entry, "team");
    entry.tested = { guest: true, staff: true };
  } else {
    entry.choice = step.options.findIndex(([, correct]) => correct);
  }
  return entry;
});

test("standard.js lists every main clause and all 93 Annex A controls", () => {
  assert.equal(clauses.length, 25);
  assert.deepEqual(annexThemes.map((theme) => theme.controls.length), [37, 8, 14, 34]);
  const ids = annexThemes.flatMap((theme) => theme.controls.map(([id]) => id));
  assert.equal(new Set(ids).size, 93);
  for (const theme of annexThemes) {
    for (const [id] of theme.controls) assert.ok(id.startsWith(`${{ org: 5, people: 6, physical: 7, tech: 8 }[theme.id]}.`), id);
  }
});

test("every clause and Annex A theme has a level, and levels cite only real clauses and controls", () => {
  assert.deepEqual(coverageGaps(), { clauses: [], themes: [], unknownClauses: [], unknownControls: [] });
  const chapterIds = new Set(chapters.map((chapter) => chapter.id));
  for (const level of levels) {
    assert.ok(chapterIds.has(level.chapter), level.id);
    assert.ok(level.clauses?.length || level.controls?.length || level.standard, `${level.id} has no standard reference`);
  }
});

test("each clause level matches the chapter of the clause it cites", () => {
  for (const level of levels.filter((item) => item.clauses)) {
    for (const id of level.clauses) {
      assert.equal(clauses.find((clause) => clause[0] === id)[1], level.chapter, level.id);
    }
  }
});

test("chapters unlock in order, but levels inside an open chapter are free to pick", () => {
  const progress = { access: solve(levels[0]) };
  assert.equal(chapterOpen("c4", progress), true);
  assert.equal(chapterOpen("c5", progress), false);
  const last = levels.find((level) => level.id === "c4_4");
  assert.equal(levelOpen(last, progress), true);
  assert.equal(levelPassed(last, progress), false);
  for (const id of ["c4_1", "c4_2", "c4_3"]) progress[id] = solve(levels.find((level) => level.id === id));
  assert.equal(chapterOpen("c5", progress), false);
  progress.c4_4 = solve(last);
  assert.equal(chapterOpen("c5", progress), true);
  assert.deepEqual(passedClauses(progress), ["4.1", "4.2", "4.3", "4.4"]);
});

test("version 1 progress moves to the new level ids", () => {
  const legacy = JSON.stringify({
    access: solve(levels[0]),
    scope: [{ choice: 1 }],
    treatment: [{ choice: 1 }, { choice: 0 }],
    unknown: [{ choice: 0 }],
  });
  const migrated = migrateLegacy(legacy);
  assert.equal(migrated.c4_3[0].choice, 1);
  assert.equal(migrated.c6_1_3[1].choice, 0);
  assert.equal(migrated.scope, undefined);
  assert.equal(migrated.unknown, undefined);
  assert.deepEqual(migrateLegacy(null), {});
  assert.deepEqual(migrateLegacy("{"), {});
});

test("the summary lists clause numbers", () => {
  const progress = {};
  for (const level of levels.slice(0, 2)) progress[level.id] = solve(level);
  const summary = buildSummary(progress);
  assert.match(summary, /條文 ?4\.1|4\.1 了解組織及其處境/);
  assert.match(summary, /已通過條文（1 \/ 25）：4\.1/);
});

test("every clause and control a level cites has a row in its clause comparison", () => {
  for (const level of levels.filter((item) => item.clauses || item.controls)) {
    const refs = (comparisons[level.id] ?? []).map(([ref]) => ref);
    assert.ok(refs.length, `${level.id} has no comparison`);
    for (const id of [...(level.clauses ?? []), ...(level.controls ?? [])]) {
      assert.ok(refs.includes(id), `${level.id} is missing ${id}`);
    }
  }
  for (const id of Object.keys(comparisons)) assert.ok(levels.some((level) => level.id === id), id);
});
