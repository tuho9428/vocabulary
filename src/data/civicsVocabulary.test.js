import test from "node:test";
import assert from "node:assert/strict";
import { VOCABULARY_SETS } from "./civicsVocabulary.js";
import { officialQuestions, questionTranslations } from "./civics2025Examples.js";

const expectedSetIds = [
  "question-words",
  "basic-test-verbs",
  "government-basics",
  "congress",
  "president",
  "courts",
  "voting-citizenship",
  "independence",
  "civil-war-1800s",
  "modern-history",
  "geography-symbols",
  "holidays",
];

test("2025 vocabulary contains all requested sets and usable example links", () => {
  assert.deepEqual(VOCABULARY_SETS.map((set) => set.id), expectedSetIds);

  const ids = new Set();
  for (const set of VOCABULARY_SETS) {
    assert.ok(set.words.length >= 10 && set.words.length <= 20, set.name);
    for (const word of set.words) {
      assert.ok(!ids.has(word.id), `duplicate ID: ${word.id}`);
      ids.add(word.id);
      assert.equal(word.category, set.id);
      assert.ok(word.english && word.vietnamese && word.pronunciation, word.id);
      assert.ok(word.questionIds.every((number) => Number.isInteger(number) && number >= 1 && number <= 128), word.id);
      assert.ok(word.questionIds.includes(word.example.questionId), word.id);
      assert.equal(word.example.english, officialQuestions[word.example.questionId], word.id);
      assert.equal(word.example.vietnamese, questionTranslations[word.example.questionId], word.id);
      assert.ok(word.example.english && word.example.vietnamese, word.id);
    }
  }

  assert.equal(ids.size, 152);
  assert.equal(officialQuestions[1], "What is the form of government of the United States?");
  assert.equal(officialQuestions[126], "Name three national U.S. holidays.");
});
