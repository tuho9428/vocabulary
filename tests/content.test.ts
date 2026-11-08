import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { allItems, contentReport, getBank } from "../src/lib/content.ts";
import { adaptVocabulary, type SourceSet } from "../src/lib/content-adapter.ts";
import { VOCABULARY_SETS } from "../src/data/civicsVocabulary.js";
import {
  CIVICS_2025_SOURCE,
  officialQuestions,
  questionTranslations,
} from "../src/data/civics2025Examples.js";

test("all adapted records preserve source IDs, words, translations, references, and provenance exactly", () => {
  const source = VOCABULARY_SETS.flatMap((set) => set.words);
  assert.equal(allItems.length, 152);
  assert.equal(new Set(allItems.map((item) => item.id)).size, 152);
  assert.equal(
    new Set(allItems.map((item) => item.english.toLowerCase())).size,
    152,
  );
  assert.deepEqual(
    allItems.map((item) => item.id),
    source.map((word) => word.id),
  );
  source.forEach((word, index) => {
    const item = allItems[index];
    assert.equal(item.english, word.english);
    assert.equal(item.vietnamese, word.vietnamese);
    assert.equal(item.pronunciation, word.pronunciation);
    assert.equal(item.category, word.category);
    assert.equal(item.level, word.level);
    assert.deepEqual(item.questionIds, word.questionIds);
    assert.equal(item.questionId, word.example.questionId);
    assert.equal(item.question, word.example.english);
    assert.equal(item.questionVietnamese, word.example.vietnamese);
    assert.equal(item.source, CIVICS_2025_SOURCE);
    assert.equal(item.sourceRevision, "M-1778, 09/25");
    assert.equal(item.sourceVersion, "2025");
    assert.equal(item.answer, undefined);
    // Added recordings augment the source; they do not alter its vocabulary fields.
    if (item.audio) assert.match(item.audio, /^\/audio\//);
  });
});

test("content validation reports absent optional fields without fabricating them", () => {
  assert.deepEqual(contentReport.errors, []);
  assert.equal(contentReport.questions, 87);
  assert.equal(contentReport.missingAnswers.length, 152);
  assert.equal(contentReport.missingAudio.length, 152);
  assert.equal(contentReport.missingPronunciation.length, 0);
  assert.equal(getBank("2025").length, 152);
  assert.deepEqual(getBank("2008"), []);
});

test("duplicate source records and inconsistent examples are reported", () => {
  const copy = structuredClone(VOCABULARY_SETS) as SourceSet[];
  copy[0].words.push(copy[0].words[0]);
  copy[0].words[1].example.english = "Invalid source question";
  const adapted = adaptVocabulary(
    copy,
    officialQuestions,
    questionTranslations,
    CIVICS_2025_SOURCE,
  );
  assert.equal(adapted.items.length, 152);
  assert.ok(adapted.report.errors.some((error) => error.includes("Duplicate")));
  assert.ok(
    adapted.report.errors.some((error) => error.includes("Example mismatch")),
  );
});

test("all learner-facing component and metadata text uses bạn, preserving công/không/thống", () => {
  const files = readdirSync(
    new URL("../src/components/", import.meta.url),
  ).filter((file) => file.endsWith(".tsx"));
  const pronoun = /(?<![\p{L}\p{M}])(?:ông|Ông|ÔNG)(?![\p{L}\p{M}])/u;
  for (const file of files)
    assert.doesNotMatch(
      readFileSync(
        new URL(`../src/components/${file}`, import.meta.url),
        "utf8",
      ),
      pronoun,
      file,
    );
  const layout = readFileSync(
    new URL("../src/app/layout.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(layout, pronoun);
  assert.match(layout, /Cùng bạn học/);
  assert.equal(
    allItems.find((item) => item.english === "citizen")!.vietnamese,
    "công dân",
  );
});
