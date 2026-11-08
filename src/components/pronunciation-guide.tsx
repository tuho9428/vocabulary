import type { ReactNode } from "react";

export function PronunciationGuide({
  reading,
  children,
}: {
  reading?: string;
  children?: ReactNode;
}) {
  if (!reading?.trim() && !children) return null;
  return (
    <div className="pronunciation-guide">
      {reading?.trim() && (
        <p className="pronunciation-vi" lang="vi">
          {reading}
        </p>
      )}
      {children}
    </div>
  );
}
