import { initialState } from "./engine.ts";
import { isDate } from "./dates.ts";
import { legacyIds, migrateV1, type LegacyState } from "./migration.ts";
import type { AppState, StudyItem } from "./types.ts";

// Keep the historical key so existing installations are discovered automatically.
export const STORAGE_KEY = "cung-ong-hoc:v1";
export const BACKUP_KEY = "cung-ong-hoc:recovery";
export const V1_BACKUP_KEY = "cung-ong-hoc:before-v2";
type StorageAdapter = Pick<Storage, "getItem" | "setItem">;
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const integer = (
  value: unknown,
  max = Number.MAX_SAFE_INTEGER,
): value is number =>
  Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= max;
const oneOf = (value: unknown, choices: readonly unknown[]) =>
  choices.includes(value);

function progressValid(value: unknown, ids: Set<string>): boolean {
  return (
    record(value) &&
    Object.entries(value).every(
      ([id, p]) =>
        ids.has(id) &&
        record(p) &&
        isDate(p.learnedOn) &&
        isDate(p.nextReview) &&
        isDate(p.lastReviewed) &&
        integer(p.intervalIndex, 4) &&
        integer(p.remembered) &&
        integer(p.forgotten),
    )
  );
}

function sessionValid(
  value: unknown,
  version: unknown,
  catalog: Map<string, string>,
  legacy = false,
): boolean {
  if (value === null) return true;
  if (
    !record(value) ||
    !isDate(value.date) ||
    value.version !== version ||
    !Array.isArray(value.queue) ||
    value.queue.length > catalog.size * 2 ||
    !integer(value.cursor, value.queue.length) ||
    !Array.isArray(value.failedIds) ||
    !Array.isArray(value.practiceIds) ||
    value.practiceIds.length > 3 ||
    !integer(value.practiceIndex, value.practiceIds.length) ||
    !oneOf(value.phase, ["study", "practice", "complete"]) ||
    (!legacy && !oneOf(value.mode, ["daily", "extra", "review"]))
  )
    return false;
  const belongs = (id: unknown) =>
    typeof id === "string" && catalog.get(id) === version;
  if (
    !value.queue.every(
      (entry) =>
        record(entry) &&
        belongs(entry.id) &&
        oneOf(
          entry.kind,
          legacy
            ? ["new", "review", "retry"]
            : ["new", "review", "retry", "practice"],
        ),
    ) ||
    !value.failedIds.every(belongs) ||
    !value.practiceIds.every(belongs)
  )
    return false;
  if (value.phase === "study" && value.cursor >= value.queue.length)
    return false;
  if (value.phase !== "study" && value.cursor !== value.queue.length)
    return false;
  if (
    value.phase === "practice" &&
    value.practiceIndex >= value.practiceIds.length
  )
    return false;
  // Every original word occurs once; a missed word can have one bounded retry.
  for (const kind of ["original", "retry"]) {
    const ids = value.queue
      .filter((entry) => (entry.kind === "retry") === (kind === "retry"))
      .map((entry) => entry.id);
    if (new Set(ids).size !== ids.length) return false;
  }
  return true;
}

function commonValid(
  value: unknown,
  catalog: Map<string, string>,
  legacy = false,
): value is Record<string, unknown> {
  if (
    !record(value) ||
    !record(value.preferences) ||
    !record(value.assignments) ||
    !progressValid(value.progress, new Set(catalog.keys()))
  )
    return false;
  const p = value.preferences;
  if (
    !oneOf(p.testVersion, ["2008", "2025"]) ||
    !oneOf(p.language, ["vi", "bilingual"]) ||
    !oneOf(p.newWordsPerDay, [1, 2, 3]) ||
    typeof p.speechRate !== "number" ||
    !Number.isFinite(p.speechRate) ||
    p.speechRate < 0.5 ||
    p.speechRate > 1 ||
    (value.lastStudiedDate !== null && !isDate(value.lastStudiedDate))
  )
    return false;
  for (const [key, ids] of Object.entries(value.assignments)) {
    const parts = key.split(":");
    if (
      parts.length !== 2 ||
      !oneOf(parts[0], ["2008", "2025"]) ||
      !isDate(parts[1]) ||
      !Array.isArray(ids) ||
      ids.length > (legacy ? 3 : catalog.size) ||
      new Set(ids).size !== ids.length ||
      !ids.every((id) => typeof id === "string" && catalog.get(id) === parts[0])
    )
      return false;
  }
  return sessionValid(value.session, p.testVersion, catalog, legacy);
}

export function isAppState(
  value: unknown,
  items: readonly StudyItem[],
): value is AppState {
  const catalog = new Map(items.map((item) => [item.id, item.sourceVersion]));
  if (
    !commonValid(value, catalog) ||
    value.schemaVersion !== 2 ||
    !record(value.preferences) ||
    !progressValid(value.archivedProgress, legacyIds) ||
    !Array.isArray(value.reviewHistory) ||
    !sessionValid(value.pausedSession, value.preferences.testVersion, catalog)
  )
    return false;
  return value.reviewHistory.every(
    (attempt) =>
      record(attempt) &&
      typeof attempt.id === "string" &&
      catalog.has(attempt.id) &&
      isDate(attempt.date) &&
      typeof attempt.remembered === "boolean" &&
      typeof attempt.scheduled === "boolean" &&
      oneOf(attempt.kind, ["new", "review", "retry", "practice"]) &&
      oneOf(attempt.mode, ["daily", "extra", "review"]),
  );
}

export function isLegacyState(
  value: unknown,
  items: readonly StudyItem[] = [],
): value is LegacyState {
  const catalog = new Map([...legacyIds].map((id) => [id, id.slice(0, 4)]));
  for (const item of items) catalog.set(item.id, item.sourceVersion);
  return commonValid(value, catalog, true) && value.schemaVersion === 1;
}

export function loadProgress(
  storage: StorageAdapter,
  items: readonly StudyItem[],
): { state: AppState; notice: string; writeBlocked?: true } {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return { state: initialState(), notice: "" };
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      /* Recover below. */
    }
    if (isAppState(parsed, items)) return { state: parsed, notice: "" };
    if (isLegacyState(parsed, items)) {
      const state = migrateV1(parsed, items);
      // Preserve the complete original, including old assignments and sessions.
      try {
        if (storage.getItem(V1_BACKUP_KEY) === null)
          storage.setItem(V1_BACKUP_KEY, raw);
      } catch {
        return {
          state,
          writeBlocked: true,
          notice:
            "Đã đọc tiến độ cũ nhưng chưa tạo được bản sao nâng cấp. Dữ liệu gốc vẫn còn; hãy kiểm tra quyền lưu trước khi đóng trang.",
        };
      }
      const saved = saveProgress(storage, state);
      return {
        state,
        notice: saved
          ? "Đã nâng cấp tiến độ. Lịch ôn của các từ trùng khớp được giữ nguyên; dữ liệu cũ còn lại đã được lưu trữ."
          : "Đã đọc tiến độ cũ nhưng chưa lưu được bản nâng cấp. Đừng đóng trang trước khi kiểm tra quyền lưu của trình duyệt.",
      };
    }
    try {
      storage.setItem(BACKUP_KEY, raw);
    } catch {
      return {
        state: initialState(),
        writeBlocked: true,
        notice:
          "Chưa tạo được bản sao tiến độ cũ. Dữ liệu gốc được giữ nguyên. Bạn có thể học tạm, nhưng lượt học này chưa được lưu. Hãy kiểm tra quyền lưu rồi tải lại trang.",
      };
    }
    return {
      state: initialState(),
      notice:
        "Không đọc được tiến độ cũ. Đã giữ bản sao để người nhà kiểm tra; có thể bắt đầu lại.",
    };
  } catch {
    return {
      state: initialState(),
      writeBlocked: true,
      notice:
        "Trình duyệt không cho phép lưu dữ liệu. Bài học vẫn dùng được, nhưng tiến độ có thể mất khi đóng trang.",
    };
  }
}

export function saveProgress(
  storage: StorageAdapter,
  state: AppState,
  writeBlocked = false,
): boolean {
  // Never replace recoverable source data when its backup could not be saved.
  if (writeBlocked) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
