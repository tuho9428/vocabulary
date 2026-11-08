// These tips describe explicit phonemic metadata, never the spelling of a word.
const ENDING_TIPS: Record<string, string> = {
  t: "Không thêm tờ.",
  d: "Không thêm đờ.",
  n: "Giữ âm n ở cuối.",
  s: "Đẩy hơi tạo tiếng sss.",
  z: "Âm z có rung; không thêm nguyên âm.",
};

export function normalizeFinalSound(sound?: string): string | undefined {
  return (
    sound
      ?.trim()
      .replace(/^\/(.+)\/$/, "$1")
      .trim() || undefined
  );
}

export function finalSoundTip(sound?: string): string | undefined {
  const phoneme = normalizeFinalSound(sound);
  if (!phoneme) return undefined;
  return (
    ENDING_TIPS[phoneme] ??
    "Không thêm nguyên âm sau âm cuối. Nghe bản đọc tiếng Anh."
  );
}

// Only style a marker already present in supplied text. Do not append endings,
// convert Vietnamese spellings, or use the result to infer finalSound metadata.
export function splitHybridReading(reading: string) {
  const match = /\([tdnsz]\)$/i.exec(reading);
  return match
    ? { base: reading.slice(0, match.index), ending: match[0] }
    : { base: reading, ending: undefined };
}
