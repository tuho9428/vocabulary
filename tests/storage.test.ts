import test from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../src/lib/engine.ts";
import type { StudyItem } from "../src/lib/types.ts";
import {
  BACKUP_KEY,
  isAppState,
  loadProgress,
  saveProgress,
  STORAGE_KEY,
} from "../src/lib/storage.ts";

const items: StudyItem[] = ["2025", "2008"].map((version) => ({
  id: `${version}-01`,
  english: "citizen",
  vietnamese: "công dân",
  source: "test",
  sourceVersion: version as "2008" | "2025",
  status: "sample",
}));
function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}
test("empty storage returns defaults without writing", () => {
  const storage = memoryStorage();
  assert.deepEqual(loadProgress(storage, items), {
    state: initialState(),
    notice: "",
  });
  assert.equal(storage.getItem(STORAGE_KEY), null);
});
test("state, preferences, and unfinished retry session round-trip", () => {
  const storage = memoryStorage();
  const state = initialState();
  state.preferences.language = "bilingual";
  state.progress["2025-01"] = {
    learnedOn: "2026-11-07",
    intervalIndex: 0,
    nextReview: "2026-11-08",
    remembered: 0,
    forgotten: 1,
    lastReviewed: "2026-11-07",
  };
  state.assignments["2025:2026-11-07"] = ["2025-01"];
  state.lastStudiedDate = "2026-11-07";
  state.session = {
    mode: "daily",
    version: "2025",
    date: "2026-11-07",
    queue: [
      { id: "2025-01", kind: "review" },
      { id: "2025-01", kind: "retry" },
    ],
    cursor: 1,
    failedIds: ["2025-01"],
    practiceIds: ["2025-01"],
    practiceIndex: 0,
    phase: "study",
  };
  assert.equal(saveProgress(storage, state), true);
  assert.deepEqual(loadProgress(storage, items), { state, notice: "" });
});
test("malformed, partial, and unsupported data are backed up before recovery", () => {
  for (const raw of [
    "not JSON",
    "null",
    "{}",
    '{"schemaVersion":99}',
    JSON.stringify({ ...initialState(), preferences: null }),
  ]) {
    const storage = memoryStorage();
    storage.setItem(STORAGE_KEY, raw);
    const loaded = loadProgress(storage, items);
    assert.deepEqual(loaded.state, initialState());
    assert.ok(loaded.notice);
    assert.equal(storage.getItem(BACKUP_KEY), raw);
    assert.equal(storage.getItem(STORAGE_KEY), raw);
  }
});
test("invalid nested progress, dates, queues, and versions cannot reach the UI", () => {
  const valid = initialState();
  const samples = [
    { ...valid, progress: { "2025-01": { intervalIndex: 200 } } },
    { ...valid, assignments: { "2025:2026-02-30": [] } },
    { ...valid, assignments: { "2025:2026-11-07": ["2008-01"] } },
    { ...valid, preferences: { ...valid.preferences, newWordsPerDay: "3" } },
    { ...valid, preferences: { ...valid.preferences, testVersion: 2025 } },
    { ...valid, preferences: { ...valid.preferences, language: ["vi"] } },
    { ...valid, lastStudiedDate: "yesterday" },
    {
      ...valid,
      session: {
        version: "2025",
        date: "2026-11-07",
        queue: [],
        cursor: 0,
        failedIds: [],
        practiceIds: [],
        practiceIndex: 0,
        phase: "study",
      },
    },
    {
      ...valid,
      session: {
        version: "2008",
        date: "2026-11-07",
        queue: [],
        cursor: 0,
        failedIds: [],
        practiceIds: [],
        practiceIndex: 0,
        phase: "complete",
      },
    },
  ];
  for (const sample of samples) assert.equal(isAppState(sample, items), false);
});
test("blocked localStorage and quota errors do not throw", () => {
  const storage = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("quota");
    },
  };
  assert.ok(loadProgress(storage, items).notice);
  assert.equal(saveProgress(storage, initialState()), false);
});
