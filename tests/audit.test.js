import assert from "node:assert/strict";
import test from "node:test";
import { clauses, clauseById, drills, lessonClauses } from "../src/audit.js";
import { auditPage, lessonClausePanel } from "../src/audit-view.js";
import { levels } from "../src/lessons.js";

test("each existing lesson step links to real, defined clauses", () => {
  for (const level of levels) {
    assert.equal(lessonClauses[level.id].length, level.steps.length, level.id);
    level.steps.forEach((_, index) => {
      const ids = lessonClauses[level.id][index];
      assert.ok(ids.length);
      assert.ok(ids.every((id) => Object.hasOwn(clauseById, id)));
      assert.match(lessonClausePanel(level, index), /可查證的證據例/);
    });
  }
});

test("index and drills reference unique clauses and offer each expected answer", () => {
  assert.equal(Object.keys(clauseById).length, clauses.length);
  for (const drill of drills) {
    assert.ok(drill.options.every((id) => Object.hasOwn(clauseById, id)));
    assert.equal(drill.options.filter((id) => id === drill.answer).length, 1);
  }
  const page = auditPage();
  assert.match(page, /查條號或關鍵字/);
  assert.doesNotMatch(page, /undefined/);
});
