import type { RefObject } from "react";
import type { StudyItem } from "@/lib/types";

function AudioButton({
  text,
  recording,
  label,
  onPlay,
}: {
  text: string;
  recording?: string;
  label: string;
  onPlay: (text: string, recording?: string) => void;
}) {
  return (
    <button
      type="button"
      className="audio-button"
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
  return (
    <section className="study-card practice-card">
      <h1 ref={heading} tabIndex={-1} lang="en">
        {item.question}
      </h1>
      {item.questionVietnamese && (
        mode === "learning" ? (
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
          <p className="eyebrow">CÂU TRẢ LỜI</p>
          {answers.length ? (
            <>
              {answers.map((answer, index) => (
                <h2 lang="en" key={index}>
                  {answer}
                </h2>
              ))}
              <AudioButton
                text={answers.join(" ")}
                recording={item.answerAudio}
                label="Nghe câu trả lời"
                onPlay={onPlay}
              />
              {item.answersVietnamese?.map((translation, index) => (
                <p className="answer-translation" key={index}>
                  {translation}
                </p>
              ))}
            </>
          ) : (
            <p className="field-help">
              {item.answerStatus === "unmatched"
                ? "Chưa tìm thấy câu hỏi này trong bộ câu hỏi có đáp án được cung cấp."
                : "Nguồn dữ liệu chưa có câu trả lời tiếng Anh cho câu hỏi này."}{" "}
              Bạn có thể xem tài liệu USCIS.
            </p>
          )}
          <button type="button" className="primary" onClick={onContinue}>
            Đã luyện tập, tiếp tục <span aria-hidden="true">→</span>
          </button>
        </div>
      ) : (
        <button type="button" className="primary" onClick={onReveal}>
          Hiện đáp án
        </button>
      )}
      <details className="question-source">
        <summary>Thông tin nguồn</summary>
        <div className="question-source-content">
          <p>USCIS {item.sourceVersion}{item.questionId != null && ` · Câu ${item.questionId}`}</p>
          {item.sourceRevision && <p>{item.sourceRevision}</p>}
          {item.answerSourceId && (
            <p>
              Đáp án từ bộ dữ liệu gia đình · {item.answerSourceId}
              {item.answerSourceVersion === "unspecified"
                ? " · Nguồn chưa ghi phiên bản đề"
                : item.answerSourceVersion ? ` · Bộ ${item.answerSourceVersion}` : ""}
            </p>
          )}
          <a href={item.source} target="_blank" rel="noreferrer">Xem tài liệu USCIS ↗</a>
        </div>
      </details>
    </section>
  );
}
