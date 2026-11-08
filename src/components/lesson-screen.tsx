import type { RefObject } from "react";
import { dailyPlan, learnedToday } from "@/lib/engine";
import type { AppState, StudyItem } from "@/lib/types";
import { PronunciationGuide } from "./pronunciation-guide";
import { CivicsQuestionCard } from "./civics-question-card";

function AudioButton({
  text,
  onPlay,
  label = "Nghe phát âm",
  recording,
}: {
  text: string;
  onPlay: (text: string, recording?: string) => void;
  label?: string;
  recording?: string;
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

export function LessonScreen({
  state,
  bank,
  today,
  heading,
  feedback,
  saved,
  revealed,
  audioNotice,
  onBack,
  onReview,
  onExtra,
  onFinish,
  onContinue,
  onReveal,
  onRecall,
  onPractice,
  onPlay,
}: {
  state: AppState;
  bank: StudyItem[];
  today: string;
  heading: RefObject<HTMLHeadingElement | null>;
  feedback: string;
  saved: boolean;
  revealed: boolean;
  audioNotice: string;
  onBack: () => void;
  onReview: () => void;
  onExtra: () => void;
  onFinish: () => void;
  onContinue: () => void;
  onReveal: () => void;
  onRecall: (remembered: boolean) => void;
  onPractice: () => void;
  onPlay: (text: string, recording?: string) => void;
}) {
  const session = state.session!;
  const exhausted = !dailyPlan(state, bank, today).unlearned.length;
  const entry = session.queue[session.cursor];
  const item = bank.find(
    (item) =>
      item.id ===
      (session.phase === "practice"
        ? session.practiceIds[session.practiceIndex]
        : entry?.id),
  );
  // Recall tests meaning only. Pronunciation help is always available.
  const showMeaning = entry?.kind === "new" || revealed;
  return (
    <div className="study-wrap">
      <button className="back-button" onClick={onBack}>
        ← Về trang chính
      </button>
      {feedback ? (
        <section className="study-card feedback-card" aria-live="polite">
          <span className="completion-symbol" aria-hidden="true">
            ✓
          </span>
          <h1 ref={heading} tabIndex={-1}>
            {feedback}
          </h1>
          <p>
            {saved
              ? "Tiến độ của bạn đã được lưu."
              : "Bài học vẫn đang mở trên thiết bị này."}
          </p>
          <button className="primary" onClick={onContinue}>
            Tiếp tục <span aria-hidden="true">→</span>
          </button>
        </section>
      ) : session.phase === "complete" ? (
        <section className="study-card completion-card">
          <span className="pill">LƯỢT HỌC ĐÃ HOÀN THÀNH</span>
          <span className="completion-symbol" aria-hidden="true">
            ✓
          </span>
          <h1 ref={heading} tabIndex={-1}>
            {exhausted && bank.length
              ? "Bạn đã học hết các từ mới!"
              : !bank.length
                ? "Chưa có dữ liệu cho bộ này"
                : "Bạn đã hoàn thành lượt học!"}
          </h1>
          <p>
            {exhausted
              ? "Bạn có thể ôn lại những từ đã học hoặc nghỉ ngơi."
              : "Bạn có thể ôn lại, học thêm vài từ hoặc nghỉ ngơi. Cứ chọn theo nhịp của mình."}
          </p>
          <div className="completion-stats">
            <strong>
              {new Set(session.queue.map((entry) => entry.id)).size}
            </strong>
            <span>từ đã luyện tập trong lượt này</span>
          </div>
          <p className="quiet">
            Bạn đã học {learnedToday(state, bank, today)} từ mới hôm nay.
          </p>
          {state.pausedSession && (
            <p className="field-help">
              Bài học tạm dừng vẫn được giữ lại. Chọn Hoàn thành để về trang
              chính, rồi Tiếp tục học.
            </p>
          )}
          <div className="completion-actions">
            <div className="recall-buttons">
              <button className="secondary" onClick={onReview}>
                Ôn lại
              </button>
              <button
                className="secondary"
                disabled={exhausted}
                onClick={onExtra}
              >
                Học thêm
              </button>
            </div>
            <button className="primary" onClick={onFinish}>
              Hoàn thành
            </button>
          </div>
        </section>
      ) : item ? (
        <>
          <div className="study-heading">
            <span className="eyebrow">
              {session.phase === "practice"
                ? "NGHE VÀ HIỂU CÂU HỎI"
                : entry.kind === "new"
                  ? session.mode === "extra"
                    ? "HỌC THÊM · TỪ MỚI"
                    : "TỪ MỚI"
                  : entry.kind === "practice"
                    ? "LUYỆN THÊM · TỪ ĐÃ HỌC"
                    : "ÔN LẠI · TỪ ĐÃ HỌC"}
            </span>
            <span>
              {session.phase === "practice"
                ? `Câu ${session.practiceIndex + 1} / ${session.practiceIds.length}`
                : `Thẻ ${session.cursor + 1} / ${session.queue.length}`}
            </span>
          </div>
          <progress
            className="study-progress"
            aria-label="Tiến độ lượt học"
            max={session.queue.length + session.practiceIds.length}
            value={
              session.phase === "study"
                ? session.cursor
                : session.queue.length + session.practiceIndex
            }
          />
          {session.phase === "study" ? (
            <section className="study-card">
              <p className="quiet">
                {entry.kind === "new"
                  ? "Bạn nghe và đọc từ này nhé."
                  : entry.kind === "retry"
                    ? "Mình thử lại từ vừa ôn nhé."
                    : "Bạn còn nhớ nghĩa của từ này không?"}
              </p>
              {state.preferences.language === "bilingual" && (
                <p className="bilingual-note" lang="en">
                  {entry.kind === "new"
                    ? "Listen and read. Take your time."
                    : "Do you remember this word?"}
                </p>
              )}
              <h1
                className="english-word"
                ref={heading}
                tabIndex={-1}
                lang="en"
              >
                {item.english}
              </h1>
              <PronunciationGuide
                reading={item.pronunciationVi}
                finalSound={item.finalSound}
              >
                {entry.kind !== "new" && (
                  <AudioButton
                    text={item.english}
                    recording={item.audio}
                    onPlay={onPlay}
                  />
                )}
              </PronunciationGuide>
              {showMeaning && (
                <div className="vocabulary-answer" aria-live="polite">
                  <h2>{item.vietnamese}</h2>
                  {item.explanation && <p>{item.explanation}</p>}
                </div>
              )}
              {entry.kind === "new" && (
                <AudioButton
                  text={item.english}
                  recording={item.audio}
                  onPlay={onPlay}
                />
              )}
              {!showMeaning ? (
                <button className="primary" onClick={onReveal}>
                  Hiện đáp án
                </button>
              ) : entry.kind === "new" ? (
                <button className="primary" onClick={() => onRecall(true)}>
                  Đã học, tiếp tục <span aria-hidden="true">→</span>
                </button>
              ) : (
                <div className="recall-buttons">
                  <button className="secondary" onClick={() => onRecall(false)}>
                    Chưa nhớ
                  </button>
                  <button className="primary" onClick={() => onRecall(true)}>
                    Nhớ rồi <span aria-hidden="true">✓</span>
                  </button>
                </div>
              )}
            </section>
          ) : (
            <CivicsQuestionCard item={item} revealed={revealed} heading={heading} onPlay={onPlay} onReveal={onReveal} onContinue={onPractice} />
          )}
          <p className="study-hint">
            Không cần vội. Bạn có thể nghe lại nhiều lần.
          </p>
        </>
      ) : (
        <p className="notice">
          Không tìm thấy thẻ này trong dữ liệu nguồn. Hãy nhờ người nhà kiểm tra
          dữ liệu; tiến độ vẫn được giữ lại.
        </p>
      )}
      {audioNotice && (
        <p className="notice" role="status">
          {audioNotice}
        </p>
      )}
    </div>
  );
}
