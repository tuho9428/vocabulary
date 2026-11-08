import test from "node:test";
import assert from "node:assert/strict";
import { addDays, isDate, localDate } from "../src/lib/dates.ts";
import {
  answerWord,
  dailyPlan,
  finishPractice,
  finishSession,
  initialState,
  INTERVALS,
  learnedToday,
  startSession,
} from "../src/lib/engine.ts";
import type { AppState, StudyItem } from "../src/lib/types.ts";

const today = "2026-11-07";
const bank: StudyItem[] = Array.from({ length: 16 }, (_, i) => ({
  id: `2025-${String(i + 1).padStart(2, "0")}`,
  english: `word${i}`,
  vietnamese: "từ",
  question: "Sample?",
  answer: "Sample.",
  explanation: "Minh họa",
  source: "Sample",
  sourceVersion: "2025",
  status: "sample",
}));
function withReviews(count: number, date = today): AppState {
  const state = initialState();
  for (const item of bank.slice(0, count))
    state.progress[item.id] = {
      learnedOn: "2026-10-01",
      intervalIndex: 2,
      nextReview: date,
      remembered: 3,
      forgotten: 0,
      lastReviewed: "2026-10-07",
    };
  return state;
}
function complete(state: AppState, day = today): AppState {
  for (let count = 0; state.session?.phase !== "complete"; count++) {
    assert.ok(count < 100, "session must finish in bounded time");
    state =
      state.session?.phase === "study"
        ? answerWord(state, true, day)
        : finishPractice(state);
  }
  return state;
}

test("new learners receive exactly 1, 2, or 3 deterministic new words", () => {
  for (const limit of [1, 2, 3] as const) {
    const state = initialState();
    state.preferences.newWordsPerDay = limit;
    assert.deepEqual(
      dailyPlan(state, bank, today).newItems.map((item) => item.id),
      bank.slice(0, limit).map((item) => item.id),
    );
  }
});
test("reviews come first and sort oldest due first", () => {
  const state = withReviews(3);
  state.progress[bank[2].id].nextReview = "2026-11-01";
  const session = startSession(state, bank, today).session!;
  assert.equal(session.queue[0].id, bank[2].id);
  assert.deepEqual(
    session.queue.slice(0, 3).map((item) => item.kind),
    ["review", "review", "review"],
  );
  assert.equal(session.queue[3].kind, "new");
});
test("future reviews are excluded; due today is included", () => {
  const state = withReviews(2);
  state.progress[bank[0].id].nextReview = "2026-11-08";
  assert.deepEqual(
    dailyPlan(state, bank, today).reviews.map((item) => item.id),
    [bank[1].id],
  );
});
test("5–9 reviews reduce new words to one; 10+ pause new words", () => {
  for (const count of [5, 9, 10, 16])
    assert.equal(
      dailyPlan(withReviews(count), bank, today).newItems.length,
      count >= 10 ? 0 : 1,
    );
});
test("new words are scheduled for tomorrow, followed by 3, 7, 14, 30 days", () => {
  const oneWordBank = bank.slice(0, 1);
  let state = initialState();
  state.preferences.newWordsPerDay = 1;
  state = answerWord(startSession(state, oneWordBank, today), true, today);
  assert.equal(state.progress[bank[0].id].nextReview, addDays(today, 1));
  for (const interval of [...INTERVALS.slice(1), 30]) {
    const date = state.progress[bank[0].id].nextReview;
    state = complete(state, date);
    state = startSession(state, oneWordBank, date);
    state = answerWord(state, true, date);
    assert.equal(
      state.progress[bank[0].id].nextReview,
      addDays(date, interval),
    );
  }
});
test("forgotten words retry once after other reviews and before new words", () => {
  let state = startSession(withReviews(2), bank, today);
  state = answerWord(state, false, today);
  assert.deepEqual(
    state.session!.queue.slice(0, 4).map((item) => item.kind),
    ["review", "review", "retry", "new"],
  );
  assert.equal(state.progress[bank[0].id].nextReview, "2026-11-08");
  state = answerWord(state, true, today);
  state = answerWord(state, false, today);
  assert.equal(
    state.session!.queue.filter((item) => item.kind === "retry").length,
    1,
  );
  assert.equal(state.progress[bank[0].id].forgotten, 2);
});
test("remembering a retry still schedules tomorrow", () => {
  let state = startSession(withReviews(1), bank, today);
  state = answerWord(state, false, today);
  state = answerWord(state, true, today);
  assert.equal(state.progress[bank[0].id].intervalIndex, 0);
  assert.equal(state.progress[bank[0].id].nextReview, "2026-11-08");
  assert.equal(state.progress[bank[0].id].remembered, 4);
});
test("missing many days does not reset intervals or add a penalty", () => {
  const state = withReviews(1, "2026-01-01");
  const next = answerWord(startSession(state, bank, today), true, today);
  assert.equal(next.progress[bank[0].id].intervalIndex, 3);
  assert.equal(next.progress[bank[0].id].nextReview, "2026-11-21");
});
test("unfinished sessions resume unchanged even across midnight", () => {
  const state = answerWord(
    startSession(initialState(), bank, today),
    true,
    today,
  );
  assert.deepEqual(startSession(state, bank, "2026-11-08"), state);
});
test("finishing the recommended three does not assign duplicates", () => {
  const state = complete(startSession(initialState(), bank, today));
  assert.equal(Object.keys(state.progress).length, 3);
  assert.deepEqual(startSession(state, bank, today).progress, state.progress);
  assert.equal(startSession(state, bank, today).session!.phase, "complete");
  assert.deepEqual(dailyPlan(state, bank, today).newItems, []);
});
test("an active assignment is resumed unchanged when preferences change", () => {
  let state = initialState();
  state.preferences.newWordsPerDay = 1;
  state = startSession(state, bank, today);
  state.preferences.newWordsPerDay = 3;
  assert.equal(startSession(state, bank, today).session!.queue.length, 1);
});

test("extra learning adds 1–3 genuinely new words per batch with no daily cap", () => {
  let state = complete(startSession(initialState(), bank, today));
  assert.equal(learnedToday(state, bank, today), 3);
  for (const expected of [6, 9, 12, 15, 16]) {
    state = startSession(state, bank, today, "extra");
    const fresh = state.session!.queue;
    assert.ok(fresh.length >= 1 && fresh.length <= 3);
    assert.ok(
      fresh.every((entry) => entry.kind === "new" && !state.progress[entry.id]),
    );
    state = complete(state);
    assert.equal(learnedToday(state, bank, today), expected);
  }
  assert.equal(
    startSession(state, bank, today, "extra").session!.queue.length,
    0,
  );
  assert.equal(new Set(state.assignments[`2025:${today}`]).size, bank.length);
});

test("review is separate, due-first, and never counts reviewed words as new", () => {
  const original = withReviews(3);
  original.progress[bank[0].id].nextReview = "2026-12-01";
  let state = startSession(original, bank, today, "review", true);
  assert.deepEqual(
    state.session!.queue.map((entry) => entry.kind),
    ["review", "review", "practice"],
  );
  state = complete(state);
  assert.equal(Object.keys(state.progress).length, 3);
  assert.equal(learnedToday(state, bank, today), 0);
  assert.equal(state.progress[bank[0].id].nextReview, "2026-12-01");
  assert.equal(state.progress[bank[0].id].intervalIndex, 2);
  assert.equal(state.progress[bank[1].id].nextReview, "2026-11-21");
  assert.equal(state.reviewHistory.at(-1)!.scheduled, false);
  assert.deepEqual(state.assignments, {});
});

test("successful early practice never postpones tomorrow's scheduled review", () => {
  let state = withReviews(1, "2026-11-08");
  for (let i = 0; i < 4; i++)
    state = complete(startSession(state, bank, today, "review", true));
  assert.equal(state.progress[bank[0].id].nextReview, "2026-11-08");
  assert.equal(state.progress[bank[0].id].intervalIndex, 2);
  assert.equal(state.reviewHistory.length, 4);
});

test("forgetting during early practice brings the review forward to tomorrow", () => {
  let state = startSession(
    withReviews(1, "2026-12-01"),
    bank,
    today,
    "review",
    true,
  );
  state = answerWord(state, false, today);
  assert.equal(state.progress[bank[0].id].nextReview, "2026-11-08");
  assert.equal(state.progress[bank[0].id].intervalIndex, 0);
});

test("reviewing across midnight applies scheduling once the word is due", () => {
  let state = startSession(
    withReviews(1, "2026-11-08"),
    bank,
    today,
    "review",
    true,
  );
  state = answerWord(state, true, "2026-11-08");
  assert.equal(state.progress[bank[0].id].nextReview, "2026-11-22");
  assert.equal(state.reviewHistory.at(-1)!.scheduled, true);
});

test("optional review preserves and resumes the exact unfinished lesson", () => {
  let state = answerWord(
    startSession(initialState(), bank, today),
    true,
    today,
  );
  const paused = structuredClone(state.session);
  state = startSession(state, bank, today, "review", true);
  assert.deepEqual(state.pausedSession, paused);
  state = complete(state);
  state = finishSession(state);
  assert.deepEqual(state.session, paused);
  assert.equal(state.pausedSession, null);
  assert.equal(state.session!.cursor, 1);
  assert.equal(learnedToday(state, bank, today), 1);
});

test("empty banks and review with no learned words complete gracefully", () => {
  for (const mode of ["daily", "extra", "review"] as const) {
    assert.equal(
      startSession(initialState(), [], today, mode).session!.phase,
      "complete",
    );
  }
  assert.equal(
    startSession(initialState(), bank, today, "review", true).session!.queue
      .length,
    0,
  );
});
test("new assignments roll over and exclude previously learned words", () => {
  const state = complete(startSession(initialState(), bank, today));
  const next = startSession(state, bank, "2026-11-08");
  assert.deepEqual(
    next
      .session!.queue.filter((entry) => entry.kind === "new")
      .map((entry) => entry.id),
    bank.slice(3, 6).map((item) => item.id),
  );
});
test("finishing a carried session counts toward the actual day's new word allowance", () => {
  let state = startSession(initialState(), bank, "2026-11-06");
  state = complete(state, today);
  assert.equal(dailyPlan(state, bank, today).newItems.length, 0);
});
test("practice covers relevant words then completes without changing recall scheduling", () => {
  let state = startSession(initialState(), bank, today);
  for (let i = 0; i < 3; i++) state = answerWord(state, true, today);
  assert.equal(state.session!.phase, "practice");
  assert.equal(state.session!.practiceIds.length, 3);
  const progress = structuredClone(state.progress);
  state = complete(state);
  assert.deepEqual(state.progress, progress);
  assert.equal(state.session!.phase, "complete");
});
test("test versions do not mix even if passed a combined bank", () => {
  const oldBank = bank.map((item) => ({
    ...item,
    id: item.id.replace("2025", "2008"),
    sourceVersion: "2008" as const,
  }));
  const state = withReviews(2);
  state.preferences.testVersion = "2008";
  const plan = dailyPlan(state, [...bank, ...oldBank], today);
  assert.equal(plan.reviews.length, 0);
  assert.ok(plan.newItems.every((item) => item.id.startsWith("2008-")));
});
test("an exhausted bank produces a valid empty completed session", () => {
  const state = withReviews(bank.length, "2026-12-01");
  const session = startSession(state, bank, today).session!;
  assert.equal(session.phase, "complete");
  assert.equal(session.queue.length, 0);
});
test("local date uses the user's calendar, and date math crosses DST, month, year, leap day", () => {
  assert.equal(localDate(new Date(2026, 10, 7, 23, 59)), today);
  assert.equal(addDays("2026-11-01", 1), "2026-11-02");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2026-02-28", 1), "2026-03-01");
  assert.equal(isDate("2026-02-30"), false);
  assert.equal(isDate("11/07/2026"), false);
});
