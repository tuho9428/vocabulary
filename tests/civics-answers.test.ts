import "./helpers/register-tsx.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import {
  adaptCivics,
  attachCivicsAnswers,
  normalizeAnswers,
  validateCivicsAnswers,
  answerValidationFailed,
  validateCivicsAnswerAttachments,
} from "../src/lib/civics-adapter.ts";
import {
  allItems,
  civicsQuestions,
  civicsAnswerReport,
} from "../src/lib/content.ts";
import type { StudyItem } from "../src/lib/types.ts";
import { initialState } from "../src/lib/engine.ts";
import { loadProgress, saveProgress, STORAGE_KEY } from "../src/lib/storage.ts";

const { CivicsQuestionCard } =
  await import("../src/components/civics-question-card.tsx");
const { LessonScreen } = await import("../src/components/lesson-screen.tsx");
const raw = JSON.parse(
  readFileSync(new URL("../src/data/civics.json", import.meta.url), "utf8"),
);
const supreme = allItems.find((item) => item.questionId === 2)!;
function render(item: StudyItem, revealed = true, mode: "learning" | "practice" = "learning") {
  return renderToStaticMarkup(
    createElement(CivicsQuestionCard, {
      item,
      mode,
      revealed,
      heading: createRef<HTMLHeadingElement>(),
      onPlay: () => {},
      onReveal: () => {},
      onContinue: () => {},
    }),
  );
}

test("all 100 nested bilingual source answers and questions survive import exactly", () => {
  assert.equal(civicsAnswerReport.sourceQuestions, 100);
  assert.equal(civicsAnswerReport.sourceQuestionsWithAnswers, 100);
  assert.equal(civicsAnswerReport.importedQuestionsWithAnswers, 100);
  assert.equal(answerValidationFailed(civicsAnswerReport), false);
  for (const row of raw) {
    const imported = civicsQuestions.find((item) => item.id === row.id)!;
    assert.deepEqual(imported.question, row.question);
    assert.deepEqual(imported.answers, [row.answer.en]);
    assert.deepEqual(imported.answersVietnamese, [row.answer.vi]);
  }
});

test("beginner questions show translation while practice offers a closed inline disclosure", () => {
  const learning = render(supreme, false, "learning");
  assert.match(learning, /class="question-translation" lang="vi"/);
  assert.doesNotMatch(learning, /Xem tiếng Việt/);
  const practice = render(supreme, false, "practice");
  assert.match(practice, /<details class="question-translation-toggle"><summary>Xem tiếng Việt<\/summary>/);
  assert.match(practice, /class="question-translation" lang="vi"/);
  assert.doesNotMatch(practice, /<details[^>]*open|The Constitution\.|Hiến pháp\./);
  assert.match(practice, /Hiện đáp án/);
  assert.match(render(supreme, true, "practice"), /The Constitution\./);
  const absent = render({ ...supreme, questionVietnamese: undefined }, false, "practice");
  assert.doesNotMatch(absent, /Xem tiếng Việt|question-translation/);
});

test("source metadata is optional, closed, and separate from the question and answer actions", () => {
  for (const mode of ["learning", "practice"] as const) {
    const html = render(supreme, false, mode);
    assert.match(html, /<details class="question-source"><summary>Thông tin nguồn<\/summary>/);
    assert.match(html, /USCIS 2025/);
    assert.match(html, /q001/);
    assert.ok(html.indexOf("Hiện đáp án") < html.indexOf("Thông tin nguồn"));
    assert.doesNotMatch(html, /Bạn nghe và thử trả lời|sample-tag|<details[^>]*open/);
  }
});
test("q001 maps to the exact 2025 question text, not question number 1", () => {
  assert.equal(supreme.answerSourceId, "q001");
  assert.equal(supreme.sourceVersion, "2025");
  assert.equal(supreme.answerSourceVersion, "unspecified");
  assert.equal(supreme.answer, "The Constitution.");
  assert.equal(
    allItems.find((item) => item.questionId === 1)!.answer,
    undefined,
  );
});
test("question translation is visible first and actual bilingual answer appears after reveal", () => {
  const before = render(supreme, false);
  assert.match(before, /What is the supreme law of the land/);
  assert.match(before, /Luật cao nhất/);
  assert.match(before, /Nghe câu hỏi/);
  assert.match(before, /Hiện đáp án/);
  assert.doesNotMatch(before, /The Constitution\.|Hiến pháp\./);
  const after = render(supreme);
  assert.match(after, /The Constitution\./);
  assert.match(after, /Hiến pháp\./);
  assert.match(after, /Nghe câu trả lời/);
  assert.doesNotMatch(after, /chưa có câu trả lời/);
});
test("missing Vietnamese translations never hide English answers", () => {
  const item = {
    ...supreme,
    questionVietnamese: undefined,
    answersVietnamese: [],
  };
  assert.match(render(item), /The Constitution\./);
  assert.doesNotMatch(render(item), /chưa có câu trả lời/);
  for (const vi of [undefined, "", []]) {
    const source = [
      {
        id: "no-vi",
        question: { en: supreme.question },
        answer: { en: "English answer.", vi },
      },
    ];
    const imported = adaptCivics(source).questions;
    assert.equal(
      answerValidationFailed(validateCivicsAnswers(source, imported)),
      false,
    );
    assert.match(
      render(
        attachCivicsAnswers(
          { ...supreme, answer: undefined, answers: undefined },
          imported,
        ),
      ),
      /English answer\./,
    );
  }
});
test("plain, nested array, and bilingual-object array answers retain every alternative", () => {
  assert.deepEqual(normalizeAnswers("One; two; three."), {
    en: ["One; two; three."],
    vi: [],
    invalid: false,
  });
  assert.deepEqual(
    normalizeAnswers({ en: ["One.", "Two."], vi: ["Một.", "Hai."] }),
    { en: ["One.", "Two."], vi: ["Một.", "Hai."], invalid: false },
  );
  const array = normalizeAnswers([{ en: "One.", vi: "Một." }, { en: "Two." }]);
  assert.deepEqual(array, {
    en: ["One.", "Two."],
    vi: ["Một."],
    invalid: false,
  });
  const html = render({
    ...supreme,
    answer: "One.",
    answers: array.en,
    answersVietnamese: array.vi,
  });
  assert.match(html, /One\./);
  assert.match(html, /Two\./);
  assert.match(html, /Một\./);
  const source = [
    {
      id: "alternatives",
      question: { en: "Example?" },
      answer: { en: ["One.", "Two."], vi: ["Một.", "Hai."] },
    },
  ];
  const imported = adaptCivics(source).questions;
  assert.equal(
    answerValidationFailed(validateCivicsAnswers(source, imported)),
    false,
  );
  imported[0].answers.reverse();
  assert.deepEqual(validateCivicsAnswers(source, imported).lostAnswerIds, [
    "alternatives",
  ]);
});
test("fallback distinguishes a genuinely missing answer from an unmatched question", () => {
  const missing = {
    ...supreme,
    answer: undefined,
    answers: [],
    answersVietnamese: [],
    answerStatus: "missing" as const,
  };
  assert.match(render(missing), /Nguồn dữ liệu chưa có câu trả lời tiếng Anh/);
  assert.match(
    render({ ...missing, answerStatus: "unmatched" }),
    /Chưa tìm thấy câu hỏi này/,
  );
});
test("validation fails on lost, altered, reordered answers and invalid fields, reporting IDs", () => {
  for (const field of ["answers", "answersVietnamese"] as const) {
    const imported = structuredClone(civicsQuestions);
    imported[0][field] = [];
    const report = validateCivicsAnswers(raw, imported);
    assert.ok(report.lostAnswerIds.includes("q001"));
    assert.equal(answerValidationFailed(report), true);
  }
  const changed = structuredClone(civicsQuestions);
  changed[0].answers = ["Fabricated"];
  assert.equal(
    answerValidationFailed(validateCivicsAnswers(raw, changed)),
    true,
  );
  const bad = [
    { id: "bad", question: { en: "Question?" }, answer: { en: ["", 42] } },
  ];
  const parsed = adaptCivics(bad);
  const report = validateCivicsAnswers(bad, parsed.questions);
  assert.deepEqual(report.invalidAnswerIds, ["bad"]);
  assert.deepEqual(report.missingAnswerIds, ["bad"]);
  assert.equal(answerValidationFailed(report), true);
});
test("explicitly different test versions never attach an answer across banks", () => {
  const old = adaptCivics([
    {
      id: "old",
      version: "2008",
      question: { en: supreme.question },
      answer: { en: "Older answer" },
    },
  ]).questions;
  const bare = {
    ...supreme,
    answer: undefined,
    answers: undefined,
    answersVietnamese: undefined,
  };
  assert.equal(attachCivicsAnswers(bare, old).answerStatus, "unmatched");
  const before = structuredClone(supreme);
  render(supreme);
  assert.deepEqual(supreme, before);
});

function practiceState(item: StudyItem) {
  const state = initialState();
  state.progress[item.id] = {
    learnedOn: "2026-11-07",
    intervalIndex: 0,
    nextReview: "2026-11-08",
    lastReviewed: "2026-11-07",
    remembered: 1,
    forgotten: 0,
  };
  state.session = {
    mode: "daily",
    version: "2025",
    date: "2026-11-07",
    queue: [{ id: item.id, kind: "new" }],
    cursor: 1,
    failedIds: [],
    practiceIds: [item.id],
    practiceIndex: 0,
    phase: "practice",
  };
  return state;
}

function renderLesson(state: ReturnType<typeof initialState>, revealed: boolean) {
  return renderToStaticMarkup(createElement(LessonScreen, {
    state, bank: allItems, today: "2026-11-07", revealed,
    heading: createRef<HTMLHeadingElement>(), feedback: "", saved: true,
    audioNotice: "", onBack() {}, onReview() {}, onExtra() {}, onFinish() {},
    onContinue() {}, onReveal() {}, onRecall() {}, onPractice() {}, onPlay() {},
  }));
}

test("every matched real vocabulary example renders its full source answers through LessonScreen", () => {
  const matched = allItems.filter((item) => item.answerSourceId);
  assert.equal(matched.length, 39);
  for (const item of matched) {
    const source = civicsQuestions.find((row) => row.id === item.answerSourceId)!;
    const state = practiceState(item);
    assert.doesNotMatch(renderLesson(state, false), /class="answer-area"/);
    const after = renderLesson(state, true);
    for (const answer of source.answers)
      assert.ok(after.includes(renderToStaticMarkup(createElement("h2", { lang: "en" }, answer))), item.id);
    for (const translation of source.answersVietnamese)
      assert.ok(after.includes(renderToStaticMarkup(createElement("p", { className: "answer-translation" }, translation))), item.id);
    assert.doesNotMatch(after, /chưa có câu trả lời|Chưa tìm thấy câu hỏi này/);
  }
});

test("validation detects answers lost after import on the final vocabulary catalog", () => {
  const report = validateCivicsAnswerAttachments(allItems, civicsQuestions);
  assert.equal(report.matchedVocabularyItems, 39);
  assert.equal(report.unmatchedVocabularyIds.length, 113);
  assert.deepEqual(report.lostAnswerVocabularyIds, []);
  for (const field of ["answers", "answersVietnamese", "answerSourceId"] as const) {
    const damaged = structuredClone(allItems);
    const item = damaged.find((row) => row.id === supreme.id)!;
    delete item[field];
    assert.deepEqual(validateCivicsAnswerAttachments(damaged, civicsQuestions).lostAnswerVocabularyIds, [supreme.id]);
  }
});

test("refresh restores the practice question with answers without changing persisted progress or schedules", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
  const state = practiceState(supreme);
  assert.equal(saveProgress(storage, state), true);
  const before = storage.getItem(STORAGE_KEY);
  const loaded = loadProgress(storage, allItems);
  assert.equal(loaded.notice, "");
  assert.deepEqual(loaded.state, state);
  assert.match(renderLesson(loaded.state, true), /The Constitution\./);
  assert.match(renderLesson(loaded.state, true), /Hiến pháp\./);
  assert.deepEqual(loaded.state, state);
  assert.equal(storage.getItem(STORAGE_KEY), before);
});

test("daily and extra learning versus reviewed questions use the correct translation mode, one question at a time", () => {
  const other = allItems.find((item) => item.question !== supreme.question)!;
  for (const mode of ["daily", "extra"] as const) {
    for (const kind of ["new", "review"] as const) {
      const state = practiceState(supreme);
      state.session!.mode = mode;
      state.session!.queue = [{ id: supreme.id, kind }, { id: other.id, kind }];
      state.session!.cursor = 2;
      state.session!.practiceIds = [supreme.id, other.id];
      const before = structuredClone(state);
      const html = renderLesson(state, false);
      assert.equal((html.match(/<h1 /g) ?? []).length, 1);
      assert.match(html, /Luyện câu hỏi/);
      assert.match(html, /Câu 1 \/ 2/);
      assert.doesNotMatch(html, /NGHE VÀ HIỂU|Không cần vội|Bạn nghe và thử trả lời/);
      assert.equal(html.includes("Xem tiếng Việt"), kind === "review");
      assert.doesNotMatch(html, /class="answer-area"/);
      assert.deepEqual(state, before);
    }
  }
});
