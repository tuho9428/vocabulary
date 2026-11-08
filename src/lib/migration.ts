import { initialState } from "./engine.ts";
import type {
  AppState,
  Preferences,
  QueueEntry,
  StudyItem,
  StudySession,
  WordProgress,
} from "./types.ts";

export type LegacyState = {
  schemaVersion: 1;
  preferences: Preferences;
  progress: Record<string, WordProgress>;
  assignments: Record<string, string[]>;
  lastStudiedDate: string | null;
  session: Omit<StudySession, "mode"> | null;
};

// Fixed identity map for the previously shipped sample IDs, not learning content.
const oldWords = [
  "citizen",
  "vote",
  "law",
  "country",
  "government",
  "right",
  "freedom",
  "president",
  "state",
  "flag",
  "people",
  "history",
];
export const legacyIds = new Set(
  ["2008", "2025"].flatMap((version) =>
    oldWords.map((_, i) => `${version}-${String(i + 1).padStart(2, "0")}`),
  ),
);

export function migrateV1(
  old: LegacyState,
  catalog: readonly StudyItem[],
): AppState {
  const state = initialState();
  state.preferences = { ...old.preferences };
  state.lastStudiedDate = old.lastStudiedDate;
  const mapping = new Map(catalog.map((item) => [item.id, item.id]));
  for (const version of ["2008", "2025"] as const)
    oldWords.forEach((english, index) => {
      const match = catalog.find(
        (item) =>
          item.sourceVersion === version &&
          item.english.toLowerCase() === english,
      );
      if (match)
        mapping.set(
          `${version}-${String(index + 1).padStart(2, "0")}`,
          match.id,
        );
    });
  for (const [id, progress] of Object.entries(old.progress)) {
    const nextId = mapping.get(id);
    if (nextId) state.progress[nextId] = { ...progress };
    else state.archivedProgress[id] = { ...progress };
  }
  const mapIds = (ids: string[]) => [
    ...new Set(
      ids.map((id) => mapping.get(id)).filter((id): id is string => !!id),
    ),
  ];
  for (const [key, ids] of Object.entries(old.assignments))
    state.assignments[key] = mapIds(ids);
  const s = old.session;
  if (s && catalog.some((item) => item.sourceVersion === s.version)) {
    const mapQueue = (queue: QueueEntry[]): QueueEntry[] =>
      queue.flatMap((entry) => {
        const id = mapping.get(entry.id);
        return id ? [{ ...entry, id }] : [];
      });
    const queue = mapQueue(s.queue);
    const cursor = mapQueue(s.queue.slice(0, s.cursor)).length;
    const practiceIds = mapIds(s.practiceIds).filter((id) =>
      catalog.some((item) => item.id === id && item.question),
    );
    const practiceIndex = Math.min(
      mapIds(s.practiceIds.slice(0, s.practiceIndex)).length,
      practiceIds.length,
    );
    const phase =
      s.phase === "study" && cursor < queue.length
        ? "study"
        : s.phase !== "complete" && practiceIndex < practiceIds.length
          ? "practice"
          : "complete";
    state.session = {
      ...s,
      mode: "daily",
      queue,
      cursor,
      practiceIds,
      practiceIndex,
      phase,
      failedIds: mapIds(s.failedIds),
    };
  }
  return state;
}
