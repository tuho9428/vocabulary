import type { SourceSet } from "../src/lib/content-adapter.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { VOCABULARY_SETS } from "../src/data/civicsVocabulary.js";
import {
  completePronunciationTemplate,
  createPronunciationWorksheet,
  parseCsv,
  planPronunciationImport,
  WORKSHEET_COLUMNS,
} from "../src/lib/pronunciation-worksheet.ts";

const words = (VOCABULARY_SETS as SourceSet[]).flatMap((set) => set.words);
const template: Record<string, string> = JSON.parse(
  readFileSync(
    new URL("../src/content/pronunciation-vi.json", import.meta.url),
    "utf8",
  ),
);
const endings = JSON.parse(
  readFileSync(
    new URL("../src/content/final-sounds.json", import.meta.url),
    "utf8",
  ),
);
const worksheet = readFileSync(
  new URL("../src/content/pronunciation-worksheet.csv", import.meta.url),
  "utf8",
);
const fixture = [
  { id: "a", english: "word", vietnamese: "nghĩa" },
  { id: "b", english: 'a, "quote"', vietnamese: "nghĩa\nhai dòng" },
  { id: "c", english: "other", vietnamese: "khác" },
];
const existing = { a: "Quát", b: "", c: "" };

test("the full template covers every stable ID in original order, retaining approved readings", () => {
  assert.equal(words.length, 152);
  assert.deepEqual(
    Object.keys(template),
    words.map((word) => word.id),
  );
  assert.equal(template["question-words-what"], "Quát");
  assert.equal(template["question-words-why"], "Quai");
  assert.equal(template["question-words-how"], "Hao");
  assert.ok(
    Object.values(template).every((value) => typeof value === "string"),
  );
  assert.deepEqual(completePronunciationTemplate(words, template), template);
});
test("worksheet preserves source order, IDs, English/meaning fields and separate final sounds", () => {
  const rows = parseCsv(worksheet);
  assert.deepEqual(rows[0], Array.from(WORKSHEET_COLUMNS));
  assert.equal(rows.length, 153);
  words.forEach((word, index) => {
    const row = rows[index + 1];
    assert.equal(row[0], word.id);
    assert.equal(row[1], word.english);
    assert.equal(row[2], word.vietnamese);
    assert.equal(typeof row[3], "string");
    assert.equal(row[4], endings[word.id]?.finalSound ?? "");
  });
});
test("UTF-8 BOM, Vietnamese diacritics, commas, quotes and newlines round-trip losslessly", () => {
  const values = { a: "Quát", b: 'Âm “mới”, "đọc"\nhai dòng', c: "" };
  const csv = createPronunciationWorksheet(fixture, values, {
    a: { finalSound: "t" },
  });
  const decoded = new TextDecoder("utf-8", { fatal: true }).decode(
    new TextEncoder().encode(csv),
  );
  const parsed = parseCsv(decoded);
  assert.equal(parsed[2][1], fixture[1].english);
  assert.equal(parsed[2][2], fixture[1].vietnamese);
  assert.equal(parsed[2][3], values.b);
  const plan = planPronunciationImport(decoded, fixture, existing);
  assert.equal(plan.ok, true);
  assert.equal(plan.next.b, values.b);
  assert.equal(plan.summary.added, 1);
  assert.equal(plan.summary.missing, 1);
});
test("blank worksheet cells never erase approved readings, including with override", () => {
  for (const override of [false, true]) {
    const plan = planPronunciationImport(
      "id,pronunciationVi\r\na,\r\n",
      fixture,
      existing,
      override,
    );
    assert.equal(plan.ok, true);
    assert.equal(plan.next.a, "Quát");
    assert.equal(plan.summary.added, 0);
    assert.equal(plan.summary.unchanged, 1);
    assert.deepEqual(Object.keys(plan.next), ["a", "b", "c"]);
  }
});
test("conflicting approvals reject the import by default and require explicit override", () => {
  const csv = "id,pronunciationVi\na,Khác\nb,Mới\n";
  const before = structuredClone(existing);
  const rejected = planPronunciationImport(csv, fixture, existing);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.summary.conflicting, 1);
  assert.equal(rejected.next.a, "Quát");
  assert.deepEqual(existing, before);
  const approved = planPronunciationImport(csv, fixture, existing, true);
  assert.equal(approved.ok, true);
  assert.equal(approved.next.a, "Khác");
  assert.equal(approved.summary.overridden, 1);
  assert.equal(approved.next.b, "Mới");
});
test("unknown IDs, duplicate IDs, and malformed row lengths reject the whole import", () => {
  const bad = planPronunciationImport(
    "id,pronunciationVi\nunknown,Không\na,Quát\na,Khác\n",
    fixture,
    existing,
  );
  assert.equal(bad.ok, false);
  assert.deepEqual(bad.summary.unknownIds, ["unknown"]);
  assert.deepEqual(bad.summary.duplicateIds, ["a"]);
  assert.equal(
    planPronunciationImport(
      "id,pronunciationVi\na,Quát,extra\n",
      fixture,
      existing,
    ).ok,
    false,
  );
});
test("other columns are ignored even when edited; no final sounds or vocabulary can be imported", () => {
  const wordsBefore = structuredClone(fixture),
    endingsBefore = structuredClone(endings);
  const plan = planPronunciationImport(
    "id,english,vietnameseMeaning,pronunciationVi,finalSound\nb,Changed,Changed,Mới,z\n",
    fixture,
    existing,
  );
  assert.equal(plan.ok, true);
  assert.equal(plan.next.b, "Mới");
  assert.deepEqual(fixture, wordsBefore);
  assert.deepEqual(endings, endingsBefore);
  assert.deepEqual(Object.keys(plan.next), ["a", "b", "c"]);
});
test("malformed CSV and invalid existing IDs fail instead of guessing or deleting", () => {
  assert.throws(() => parseCsv('id,pronunciationVi\na,"unclosed'), /Unclosed/);
  assert.throws(
    () => parseCsv('id,pronunciationVi\na,"value"junk'),
    /Unexpected/,
  );
  assert.throws(
    () =>
      planPronunciationImport(
        "id,id,pronunciationVi\na,a,test",
        fixture,
        existing,
      ),
    /Duplicate CSV column/,
  );
  assert.throws(
    () => planPronunciationImport("english,reading\na,test", fixture, existing),
    /must contain/,
  );
  assert.throws(
    () =>
      completePronunciationTemplate(fixture, {
        ...existing,
        unknown: "approved",
      }),
    /Unknown existing/,
  );
});
test("importing a worksheet exported from current approved readings is a no-op and reports remaining missing readings", () => {
  // The editable on-disk worksheet may intentionally contain unimported changes.
  const current = createPronunciationWorksheet(words, template, endings);
  const result = planPronunciationImport(current, words, template);
  assert.equal(result.ok, true);
  assert.equal(result.summary.added, 0);
  assert.equal(result.summary.conflicting, 0);
  assert.equal(result.summary.unchanged, 152);
  assert.deepEqual(result.next, template);
  assert.deepEqual(result.summary.missingRows, []);
  assert.equal(
    result.summary.missing,
    Object.values(template).filter((value) => !value.trim()).length,
  );
});
