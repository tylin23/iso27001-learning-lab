import assert from "node:assert/strict";
import test from "node:test";
import { chapters, controls, requirements } from "../src/enterprise.js";
import { enterprisePage } from "../src/enterprise-view.js";
import { clauses } from "../src/audit.js";

test("the story covers every Annex A control exactly once", () => {
  const expected = [37, 8, 14, 34].flatMap((count, index) =>
    Array.from({ length: count }, (_, i) => `A.${5 + index}.${1 + i}`),
  );
  assert.deepEqual(controls.map(({ id }) => id), expected);
  assert.deepEqual(chapters.flatMap((chapter) => chapter.controls).sort(), expected.sort());
});

test("all numbered clause cards and evidence examples are linked to the story", () => {
  const ids = requirements.map(({ id }) => id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(chapters.flatMap((chapter) => chapter.requirements).sort(), [...ids].sort());
  for (const { id } of clauses) assert.ok(ids.includes(id), id);
  for (const item of [...requirements, ...controls]) {
    assert.ok(item.question && item.evidence, item.id);
  }
  const page = enterprisePage();
  assert.equal((page.match(/data-case-item/g) ?? []).length, requirements.length + controls.length);
  assert.match(page, /Amd 1:2024 · 第 4.1 條修正/);
  assert.match(page, /附錄 A A.8.34/);
  assert.doesNotMatch(page, /undefined/);
});
