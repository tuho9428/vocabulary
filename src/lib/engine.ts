import { addDays } from "./dates.ts";
import type {
  AppState,
  SessionMode,
  StudyItem,
  StudySession,
} from "./types.ts";

export const INTERVALS = [1, 3, 7, 14, 30] as const;

export function initialState(): AppState {
  return {
    schemaVersion: 2,
    preferences: {
      testVersion: "2025",
      language: "vi",
      newWordsPerDay: 3,
      speechRate: 0.75,
    },
    progress: {},
    archivedProgress: {},
    assignments: {},
    reviewHistory: [],
    lastStudiedDate: null,
    session: null,
    pausedSession: null,
  };
}

export function learnedToday(
  state: AppState,
  bank: StudyItem[],
  today: string,
): number {
  return bank.filter(
    (item) =>
      item.sourceVersion === state.preferences.testVersion &&
      state.progress[item.id]?.learnedOn === today,
  ).length;
}

export function dailyPlan(state: AppState, bank: StudyItem[], today: string) {
  const items = bank.filter(
    (item) => item.sourceVersion === state.preferences.testVersion,
  );
  const reviews = items
    .filter((item) => state.progress[item.id]?.nextReview <= today)
    .sort(
      (a, b) =>
        state.progress[a.id].nextReview.localeCompare(
          state.progress[b.id].nextReview,
        ) || a.id.localeCompare(b.id),
    );
  const unlearned = items.filter((item) => !state.progress[item.id]);
  const recommended =
    reviews.length >= 10
      ? 0
      : reviews.length >= 5
        ? 1
        : state.preferences.newWordsPerDay;
  const remaining = Math.max(
    0,
    recommended - learnedToday(state, items, today),
  );
  const key = state.preferences.testVersion + ":" + today;
  const reserved = (state.assignments[key] ?? [])
    .map((id) => unlearned.find((item) => item.id === id))
    .filter((item): item is StudyItem => !!item);
  const newItems = [
    ...reserved,
    ...unlearned.filter(
      (item) => !reserved.some((saved) => saved.id === item.id),
    ),
  ].slice(0, remaining);
  return { reviews, unlearned, newItems, key };
}

export function startSession(
  state: AppState,
  bank: StudyItem[],
  today: string,
  mode: SessionMode = "daily",
  includeEarly = false,
): AppState {
  const active = state.session && state.session.phase !== "complete";
  if (active && (mode !== "review" || state.session!.mode === "review"))
    return state;
  // Resume the lesson suspended for voluntary review before assigning more words.
  if (!active && state.pausedSession && mode !== "review")
    return { ...state, session: state.pausedSession, pausedSession: null };
  const plan = dailyPlan(state, bank, today);
  const early = includeEarly
    ? bank.filter(
        (item) =>
          item.sourceVersion === state.preferences.testVersion &&
          state.progress[item.id]?.nextReview > today,
      )
    : [];
  const selectedNew =
    mode === "review"
      ? []
      : mode === "extra"
        ? plan.unlearned.slice(0, state.preferences.newWordsPerDay)
        : plan.newItems;
  const queue =
    mode === "review"
      ? [
          ...plan.reviews.map((item) => ({
            id: item.id,
            kind: "review" as const,
          })),
          ...early.map((item) => ({ id: item.id, kind: "practice" as const })),
        ]
      : [
          ...(mode === "daily"
            ? plan.reviews.map((item) => ({
                id: item.id,
                kind: "review" as const,
              }))
            : []),
          ...selectedNew.map((item) => ({ id: item.id, kind: "new" as const })),
        ];
  const practiceIds =
    mode === "review"
      ? []
      : [...new Set(queue.map((entry) => entry.id))]
          .filter((id) => bank.some((item) => item.id === id && item.question))
          .slice(0, 3);
  // Reopen the last completion choices rather than inventing an empty new lesson.
  if (mode === "daily" && !queue.length && state.session?.phase === "complete")
    return state;
  const session: StudySession = {
    date: today,
    version: state.preferences.testVersion,
    mode,
    queue,
    cursor: 0,
    failedIds: [],
    practiceIds,
    practiceIndex: 0,
    phase: queue.length ? "study" : "complete",
  };
  return {
    ...state,
    session,
    pausedSession: active ? state.session : state.pausedSession,
    assignments: selectedNew.length
      ? {
          ...state.assignments,
          [plan.key]: [
            ...new Set([
              ...(state.assignments[plan.key] ?? []),
              ...selectedNew.map((item) => item.id),
            ]),
          ],
        }
      : state.assignments,
  };
}

export function finishSession(state: AppState): AppState {
  if (!state.session || state.session.phase !== "complete") return state;
  if (!state.pausedSession) return state;
  return { ...state, session: state.pausedSession, pausedSession: null };
}

export function answerWord(
  state: AppState,
  remembered: boolean,
  today: string,
): AppState {
  const session = state.session;
  if (!session || session.phase !== "study") return state;
  const entry = session.queue[session.cursor];
  const old = state.progress[entry.id];
  const failed = session.failedIds.includes(entry.id) || !remembered;
  // Successful voluntary practice before the due date must never postpone a review.
  const scheduled = !old || failed || old.nextReview <= today;
  const intervalIndex = !scheduled
    ? old.intervalIndex
    : failed
      ? 0
      : old
        ? Math.min(old.intervalIndex + 1, INTERVALS.length - 1)
        : 0;
  const nextReview = scheduled
    ? addDays(today, INTERVALS[intervalIndex])
    : old.nextReview;
  const queue = [...session.queue];
  if (!remembered && entry.kind !== "retry") {
    const nextNew = queue.findIndex(
      (item, index) => index > session.cursor && item.kind === "new",
    );
    queue.splice(nextNew < 0 ? queue.length : nextNew, 0, {
      id: entry.id,
      kind: "retry",
    });
  }
  const cursor = session.cursor + 1;
  return {
    ...state,
    lastStudiedDate: today,
    progress: {
      ...state.progress,
      [entry.id]: {
        learnedOn: old?.learnedOn ?? today,
        intervalIndex,
        nextReview,
        remembered: (old?.remembered ?? 0) + Number(remembered),
        forgotten: (old?.forgotten ?? 0) + Number(!remembered),
        lastReviewed: today,
      },
    },
    reviewHistory: [
      ...state.reviewHistory,
      {
        id: entry.id,
        date: today,
        remembered,
        kind: entry.kind,
        mode: session.mode,
        scheduled,
      },
    ],
    session: {
      ...session,
      queue,
      cursor,
      failedIds: failed
        ? [...new Set([...session.failedIds, entry.id])]
        : session.failedIds,
      phase:
        cursor >= queue.length
          ? session.practiceIds.length
            ? "practice"
            : "complete"
          : "study",
    },
  };
}

export function finishPractice(state: AppState): AppState {
  if (!state.session || state.session.phase !== "practice") return state;
  const practiceIndex = state.session.practiceIndex + 1;
  return {
    ...state,
    session: {
      ...state.session,
      practiceIndex,
      phase:
        practiceIndex >= state.session.practiceIds.length
          ? "complete"
          : "practice",
    },
  };
}
