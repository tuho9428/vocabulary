import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { allItems } from "../src/lib/content.ts";
import { adaptVocabulary, type SourceSet } from "../src/lib/content-adapter.ts";
import { VOCABULARY_SETS } from "../src/data/civicsVocabulary.js";
import {
  CIVICS_2025_SOURCE,
  officialQuestions,
  questionTranslations,
} from "../src/data/civics2025Examples.js";

const readings: Record<string, string> = JSON.parse(
  readFileSync(
    new URL("../src/content/pronunciation-vi.json", import.meta.url),
    "utf8",
  ),
);

test("the three supplied Vietnamese readings attach to the existing vocabulary IDs", () => {
  for (const [english, reading] of [
    ["what", "Quát"],
    ["why", "Quai"],
    ["how", "Hao"],
  ]) {
    const word = allItems.find((item) => item.english === english)!;
    assert.equal(word.pronunciationVi, reading);
    assert.equal(word.id, `question-words-${english}`);
  }
  for (const [id, reading] of Object.entries(readings)) {
    assert.ok(
      allItems.some((item) => item.id === id),
      `Unknown reading ID ${id}`,
    );
    assert.ok(reading.trim());
  }
});

test("missing Vietnamese readings stay absent instead of converting English respellings", () => {
  const source = (VOCABULARY_SETS as SourceSet[]).flatMap((set) => set.words);
  allItems.forEach((item, index) => {
    assert.equal(
      item.pronunciationVi,
      source[index].pronunciationVi?.trim() || readings[item.id],
    );
    assert.equal(item.pronunciation, source[index].pronunciation);
    assert.equal(item.english, source[index].english);
    assert.equal(item.vietnamese, source[index].vietnamese);
  });
});

test("the adapter reuses explicit source pronunciationVi and treats blank readings as missing", () => {
  const source = structuredClone(VOCABULARY_SETS) as SourceSet[];
  source[0].words[0].pronunciationVi = "  Quát  ";
  source[0].words[1].pronunciationVi = "   ";
  const adapted = adaptVocabulary(
    source,
    officialQuestions,
    questionTranslations,
    CIVICS_2025_SOURCE,
  );
  assert.equal(adapted.items[0].pronunciationVi, "Quát");
  assert.equal(adapted.items[1].pronunciationVi, undefined);
  assert.deepEqual(
    adapted.items.map((item) => item.id),
    allItems.map((item) => item.id),
  );
});
