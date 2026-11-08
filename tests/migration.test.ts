import test from "node:test";
import assert from "node:assert/strict";
import { allItems } from "../src/lib/content.ts";
import {
  answerWord,
  finishPractice,
  initialState,
  learnedToday,
  startSession,
} from "../src/lib/engine.ts";
import { migrateV1, type LegacyState } from "../src/lib/migration.ts";
import {
  isAppState,
  loadProgress,
  saveProgress,
  STORAGE_KEY,
  V1_BACKUP_KEY,
} from "../src/lib/storage.ts";
import type { AppState, WordProgress } from "../src/lib/types.ts";

const today = "2026-11-07";
const progress: WordProgress = {
  learnedOn: "2026-10-01",
  intervalIndex: 2,
  nextReview: today,
  remembered: 3,
  forgotten: 1,
  lastReviewed: "2026-10-31",
};
function legacy(): LegacyState {
  return {
    schemaVersion: 1,
    preferences: initialState().preferences,
    progress: {
      "2025-01": { ...progress },
      "2025-04": { ...progress },
      "2008-10": { ...progress },
    },
    assignments: { "2025:2026-11-07": ["2025-02", "2025-03"] },
    lastStudiedDate: "2026-10-31",
    session: {
      date: today,
      version: "2025",
      queue: [
        { id: "2025-01", kind: "review" },
        { id: "2025-02", kind: "new" },
        { id: "2025-03", kind: "new" },
      ],
      cursor: 1,
      failedIds: [],
      practiceIds: ["2025-01", "2025-02", "2025-03"],
      practiceIndex: 0,
      phase: "study",
    },
  };
}
function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}
function complete(state: AppState) {
  for (let i = 0; state.session!.phase !== "complete"; i++) {
    assert.ok(i < 400);
    state =
      state.session!.phase === "study"
        ? answerWord(state, true, today)
        : finishPractice(state);
  }
  return state;
}

test("v1 upgrade preserves same-version schedules and IDs from the real source", () => {
  const old = legacy();
  const upgraded = migrateV1(old, allItems);
  const citizen = allItems.find((item) => item.english === "citizen")!;
  const vote = allItems.find((item) => item.english === "vote")!;
  assert.deepEqual(upgraded.progress[citizen.id], progress);
  assert.equal(upgraded.session!.queue[upgraded.session!.cursor].id, vote.id);
  assert.deepEqual(upgraded.archivedProgress["2025-04"], progress);
  assert.deepEqual(upgraded.archivedProgress["2008-10"], progress);
  assert.equal(Object.keys(upgraded.progress).length, 1);
  assert.equal(isAppState(upgraded, allItems), true);
  assert.deepEqual(upgraded.reviewHistory, []); // No fabricated timestamps for historical attempts.
  assert.deepEqual(old, legacy());
});

test("load upgrades once, backs up the exact v1 JSON, and survives restart", () => {
  const storage = memory();
  const raw = JSON.stringify(legacy());
  storage.setItem(STORAGE_KEY, raw);
  const loaded = loadProgress(storage, allItems);
  assert.equal(loaded.state.schemaVersion, 2);
  assert.ok(loaded.notice.includes("nâng cấp"));
  assert.equal(storage.getItem(V1_BACKUP_KEY), raw);
  assert.deepEqual(loadProgress(storage, allItems), {
    state: loaded.state,
    notice: "",
  });
  assert.equal(storage.getItem(V1_BACKUP_KEY), raw);
});

test("v1 records already using authoritative source IDs are preserved unchanged", () => {
  const old = legacy();
  const id = allItems[0].id;
  old.progress[id] = { ...progress };
  const storage = memory();
  storage.setItem(STORAGE_KEY, JSON.stringify(old));
  const loaded = loadProgress(storage, allItems);
  assert.deepEqual(loaded.state.progress[id], progress);
  assert.equal(loaded.state.schemaVersion, 2);
});

test("a 2008 installation is archived without importing 2025 questions into its bank", () => {
  const old = legacy();
  old.preferences.testVersion = "2008";
  old.session = null;
  const upgraded = migrateV1(old, allItems);
  assert.equal(upgraded.preferences.testVersion, "2008");
  assert.equal(upgraded.session, null);
  assert.ok(upgraded.archivedProgress["2008-10"]);
  assert.equal(isAppState(upgraded, allItems), true);
});

test("readable progress remains in memory even if backup storage is full", () => {
  const raw = JSON.stringify(legacy());
  const loaded = loadProgress(
    {
      getItem: (key) => (key === STORAGE_KEY ? raw : null),
      setItem: () => {
        throw new Error("quota");
      },
    },
    allItems,
  );
  assert.equal(Object.keys(loaded.state.progress).length, 1);
  assert.ok(loaded.notice.includes("chưa tạo được bản sao"));
});

test("extra sessions, unlimited assignments, and history round-trip after refresh", () => {
  let state = complete(startSession(initialState(), allItems, today));
  state = answerWord(
    startSession(state, allItems, today, "extra"),
    true,
    today,
  );
  const storage = memory();
  assert.equal(saveProgress(storage, state), true);
  const restored = loadProgress(storage, allItems).state;
  assert.deepEqual(restored, state);
  assert.equal(restored.session!.mode, "extra");
  assert.equal(restored.session!.cursor, 1);
  assert.equal(restored.assignments[`2025:${today}`].length, 6);
  assert.equal(restored.reviewHistory.length, 4);
  assert.equal(learnedToday(restored, allItems, today), 4);
  assert.deepEqual(startSession(restored, allItems, "2026-11-08"), restored);
});

test("a review and its paused lesson both survive a browser refresh", () => {
  let state = answerWord(
    startSession(initialState(), allItems, today),
    true,
    today,
  );
  state = startSession(state, allItems, today, "review", true);
  const storage = memory();
  saveProgress(storage, state);
  const restored = loadProgress(storage, allItems).state;
  assert.deepEqual(restored, state);
  assert.equal(restored.pausedSession!.cursor, 1);
  assert.equal(restored.session!.mode, "review");
});
