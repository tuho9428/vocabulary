import type { RefObject } from "react";
import type { StudyItem } from "@/lib/types";
import { hasUsableCivicsAnswer } from "@/lib/uscis-2025";

function AudioButton({
  text,
  recording,
  label,
  onPlay,
  accessibleLabel,
}: {
  text: string;
  recording?: string;
  label: string;
  onPlay: (text: string, recording?: string) => void;
  accessibleLabel?: string;
}) {
  return (
    <button
      type="button"
      className="audio-button"
      aria-label={accessibleLabel}
      onClick={() => onPlay(text, recording)}
    >
      <span aria-hidden="true" className="speaker">
        ♪
      </span>
      {label}
    </button>
  );
}
export function CivicsQuestionCard({
  item,
  mode = "learning",
  revealed,
  heading,
  onPlay,
  onReveal,
  onContinue,
}: {
  item: StudyItem;
  mode?: "learning" | "practice";
  revealed: boolean;
  heading: RefObject<HTMLHeadingElement | null>;
  onPlay: (text: string, recording?: string) => void;
  onReveal: () => void;
  onContinue: () => void;
}) {
  const answers = item.answers?.length
    ? item.answers
    : item.answer?.trim()
      ? [item.answer]
      : [];
  const usable = hasUsableCivicsAnswer(item);
  const count = item.requiredAnswers ?? 1;
  const recommended = answers.slice(0, count);
  const alternatives = answers.slice(count);
  return (
    <section className="study-card practice-card">
      <h1 ref={heading} tabIndex={-1} lang="en">
        {item.question}
      </h1>
      {item.questionVietnamese && (
        mode === "learning" || revealed ? (
          <p className="question-translation" lang="vi">{item.questionVietnamese}</p>
        ) : (
          <details className="question-translation-toggle">
            <summary>Xem tiếng Việt</summary>
            <p className="question-translation" lang="vi">{item.questionVietnamese}</p>
          </details>
        )
      )}
      <AudioButton
        text={item.question!}
        recording={item.questionAudio}
        label="Nghe câu hỏi"
        onPlay={onPlay}
      />
      {revealed ? (
        <div className="answer-area" aria-live="polite">
          {usable ? (
            <>
              <p className="answer-label">ĐÁP ÁN CHÍNH</p>
              {recommended.map((answer, index) => (
                <h2 lang="en" key={index}>
                  {answer}
                </h2>
              ))}
              {item.answersVietnamese?.slice(0, count).map((translation, index) => (
                <p className="answer-translation" lang="vi" key={index}>
                  {translation}
                </p>
              ))}
              <AudioButton
                text={recommended.join(" ")}
                label="Nghe đáp án"
                onPlay={onPlay}
              />
              {alternatives.length > 0 && (
                <details className="accepted-answers">
                  <summary>Các đáp án khác</summary>
                  <ul>
                    {alternatives.map((answer, index) => (
                      <li key={index}>
                        <span lang="en">{answer}</span>
                        <AudioButton
                          text={answer}
                          label="Nghe"
                          accessibleLabel={`Nghe: ${answer}`}
                          onPlay={onPlay}
                        />
                        {item.answersVietnamese?.[index + count] && (
                          <p lang="vi">{item.answersVietnamese[index + count]}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          ) : (
            <p className="field-help">
              {item.dynamicAnswer ? "Câu này cần đáp án theo nơi ở hoặc người đương nhiệm." : "Chưa có đáp án cho câu này."}
            </p>
          )}
          <button type="button" className="primary" onClick={onContinue}>
            {usable ? "Tiếp tục" : "Bỏ qua"} <span aria-hidden="true">→</span>
          </button>
        </div>
      ) : (
        <button type="button" className="primary" onClick={onReveal}>
          Hiện đáp án
        </button>
      )}
    </section>
  );
}
