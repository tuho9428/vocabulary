import type { ReactNode } from "react";
import {
  finalSoundTip,
  normalizeFinalSound,
  splitHybridReading,
} from "@/lib/pronunciation";

export function PronunciationGuide({
  reading,
  finalSound,
  children,
}: {
  reading?: string;
  finalSound?: string;
  children?: ReactNode;
}) {
  const phoneme = normalizeFinalSound(finalSound);
  const tip = finalSoundTip(finalSound);
  const parts = reading ? splitHybridReading(reading) : undefined;
  if (!parts && !tip && !children) return null;
  return (
    <div className="pronunciation-guide">
      {parts && (
        <p className="pronunciation-vi" lang="vi">
          <span className="pronunciation-vi-label">Cách đọc gần đúng</span>
          <span>
            {parts.base}
            {parts.ending && (
              <strong className="english-ending">{parts.ending}</strong>
            )}
          </span>
        </p>
      )}
      {children}
      {tip && (
        <p className="final-sound-tip">
          <strong>Âm cuối /{phoneme}/:</strong> {tip}
        </p>
      )}
      {parts?.ending && (
        <p className="phonetic-explanation">
          Âm trong ngoặc đọc bằng tiếng Anh, không thêm nguyên âm.
        </p>
      )}
    </div>
  );
}
