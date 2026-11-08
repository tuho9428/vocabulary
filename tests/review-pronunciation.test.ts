import "./helpers/register-tsx.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { allItems } from "../src/lib/content.ts";
import { answerWord, initialState, startSession } from "../src/lib/engine.ts";
import { loadProgress, saveProgress, STORAGE_KEY } from "../src/lib/storage.ts";
import type { AppState, StudyItem } from "../src/lib/types.ts";

const { LessonScreen } = await import("../src/components/lesson-screen.tsx");
const { PronunciationGuide } =
  await import("../src/components/pronunciation-guide.tsx");
const today = "2026-11-07";
const endingUi = /final-sound-tip|english-ending|phonetic-explanation|Âm cuối|Không thêm tờ|Không thêm đờ|Giữ âm n|tiếng sss|không thêm nguyên âm/;
function learned(...ids: string[]) {
  const state = initialState();
  for (const id of ids)
    state.progress[id] = {
      learnedOn: "2026-11-01",
      intervalIndex: 1,
      nextReview: today,
      remembered: 2,
      forgotten: 0,
      lastReviewed: "2026-11-04",
    };
  return state;
}
function render(
  state: AppState,
  revealed: boolean,
  bank: StudyItem[] = allItems,
) {
  const noop = () => {};
  return renderToStaticMarkup(
    createElement(LessonScreen, {
      state,
      bank,
      today,
      revealed,
      heading: createRef<HTMLHeadingElement>(),
      feedback: "",
      saved: true,
      audioNotice: "",
      onBack: noop,
      onReview: noop,
      onExtra: noop,
      onFinish: noop,
      onContinue: noop,
      onReveal: noop,
      onRecall: noop,
      onPractice: noop,
      onPlay: noop,
    }),
  );
}

for (const { name, mode, includeEarly } of [
  { name: "home due review", mode: "review", includeEarly: false },
  { name: "Luyện tất cả", mode: "review", includeEarly: true },
  { name: "daily spaced review", mode: "daily", includeEarly: false },
] as const) {
  test(`${name} cards show pronunciation help immediately and reveal only the meaning`, () => {
    const saved = learned("question-words-what");
    if (includeEarly)
      saved.progress["question-words-what"].nextReview = "2026-11-10";
    const state = startSession(saved, allItems, today, mode, includeEarly);
    const before = structuredClone(state);
    const hidden = render(state, false);
    assert.match(hidden, /what/);
    assert.match(hidden, /Nghe phát âm/);
    assert.match(hidden, /Hiện đáp án/);
    assert.match(hidden, /Quát/);
    assert.doesNotMatch(hidden, endingUi);
    assert.doesNotMatch(hidden, /gì \/ cái gì|Nhớ rồi|Chưa nhớ/);
    assert.ok(hidden.indexOf("Quát") < hidden.indexOf("Nghe phát âm"));
    assert.ok(hidden.indexOf("Nghe phát âm") < hidden.indexOf("Hiện đáp án"));
    const revealed = render(state, true);
    assert.match(revealed, /Quát/);
    assert.match(revealed, /gì \/ cái gì/);
    assert.doesNotMatch(revealed, endingUi);
    assert.match(revealed, /Nhớ rồi/);
    assert.match(revealed, /Chưa nhớ/);
    assert.doesNotMatch(revealed, /<details|<summary/);
    assert.deepEqual(state, before);
  });
  test(`${name} cards work without pronunciation data and do not invent a tip`, () => {
    // Use an explicit absent-data fixture; approved readings may be added later.
    const bank = allItems.map((item) => item.id === "question-words-who"
      ? { ...item, pronunciationVi: undefined, finalSound: undefined }
      : item);
    const state = startSession(
      learned("question-words-who"),
      bank,
      today,
      mode,
      includeEarly,
    );
    const hidden = render(state, false, bank);
    assert.match(hidden, /Nghe phát âm/);
    assert.match(hidden, /Hiện đáp án/);
    assert.doesNotMatch(hidden, /final-sound-tip|pronunciation-vi|>ai<\/h2>/);
    const revealed = render(state, true, bank);
    assert.match(revealed, />ai<\/h2>/);
    assert.doesNotMatch(revealed, /final-sound-tip/);
  });
}

test("restored review IDs resolve to current catalog metadata, not a reduced saved word snapshot", () => {
  const state = startSession(
    learned("question-words-what"),
    allItems,
    today,
    "review",
  );
  let raw: string | null = null;
  const storage = {
    getItem: (key: string) => (key === STORAGE_KEY ? raw : null),
    setItem: (_key: string, value: string) => {
      raw = value;
    },
  };
  saveProgress(storage, state);
  const restored = loadProgress(storage, allItems).state;
  assert.deepEqual(restored, state);
  assert.equal(restored.session!.queue[0].id, "question-words-what");
  assert.match(render(restored, true), /Quát/);
  assert.doesNotMatch(render(restored, true), endingUi);
  assert.doesNotMatch(render(restored, false), endingUi);
  assert.doesNotMatch(render(restored, false), /gì \/ cái gì/);
});

test("supplied hybrid readings remain verbatim without final-sound labels or explanations", () => {
  const state = startSession(
    learned("basic-test-verbs-decide"),
    allItems,
    today,
    "review",
  );
  assert.doesNotMatch(render(state, true), endingUi);
  assert.doesNotMatch(render(state, false), endingUi);
  const hybrid = renderToStaticMarkup(
    createElement(PronunciationGuide, { reading: "Be(d)" }),
  );
  assert.match(hybrid, />Be\(d\)<\/p>/);
  assert.doesNotMatch(hybrid, endingUi);
  assert.doesNotMatch(hybrid, /<button|<summary|<details/);
});

test("why shows Quai before reveal, while its source meaning stays hidden", () => {
  const state = startSession(
    learned("question-words-why"),
    allItems,
    today,
    "review",
    true,
  );
  const hidden = render(state, false);
  assert.match(hidden, /why/);
  assert.match(hidden, /Quai/);
  assert.doesNotMatch(hidden, /tại sao/);
  assert.match(render(state, true), /tại sao/);
});

test("retry cards retain pronunciation help but hide meaning again", () => {
  let state = startSession(
    learned("question-words-what"),
    allItems,
    today,
    "review",
  );
  state = answerWord(state, false, today);
  assert.equal(state.session!.queue[state.session!.cursor].kind, "retry");
  const hidden = render(state, false);
  assert.match(hidden, /Quát/);
  assert.doesNotMatch(hidden, endingUi);
  assert.doesNotMatch(hidden, /gì \/ cái gì/);
});

test("all 152 new-word cards preserve the exact supplied reading, meaning and audio without ending UI", () => {
  for (const item of allItems) {
    const state = startSession(initialState(), [item], today, "daily");
    const html = render(state, false, [item]);
    assert.ok(item.pronunciationVi?.trim(), item.id);
    const reading = renderToStaticMarkup(createElement("p", { className: "pronunciation-vi", lang: "vi" }, item.pronunciationVi));
    assert.ok(html.includes(reading), item.id);
    assert.match(html, /Nghe phát âm/);
    assert.ok(html.includes(renderToStaticMarkup(createElement("h2", null, item.vietnamese))), item.id);
    assert.doesNotMatch(html, endingUi, item.id);
  }
});

test("all retained final-sound metadata stays invisible in every review mode before and after reveal", () => {
  for (const item of allItems.filter(item => item.finalSound)) {
    for (const mode of ["daily", "review"] as const) {
      const state = startSession(learned(item.id), [item], today, mode, true);
      for (const revealed of [false, true]) {
        const html = render(state, revealed, [item]);
        assert.doesNotMatch(html, endingUi, item.id);
        assert.match(html, /pronunciation-vi/);
        assert.match(html, /Nghe phát âm/);
        assert.equal(html.includes(renderToStaticMarkup(createElement("h2", null, item.vietnamese))), revealed);
      }
    }
  }
});
