import test from "node:test";
import assert from "node:assert/strict";
import { levels } from "../src/lessons.js";
import {
  buildSummary, isSolved, newEntry, nextLevel, permissions, readProgress, setLabSetting,
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
  assert.equal(nextLevel(saved).id, "scope");
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
