import type { RefObject } from "react";
import { dailyPlan } from "@/lib/engine";
import type { AppState, StudyItem } from "@/lib/types";

export function ReviewScreen({
  state,
  bank,
  today,
  heading,
  onBack,
  onStart,
  onLearn,
}: {
  state: AppState;
  bank: StudyItem[];
  today: string;
  heading: RefObject<HTMLHeadingElement | null>;
  onBack: () => void;
  onStart: (includeEarly: boolean) => void;
  onLearn: () => void;
}) {
  const due = dailyPlan(state, bank, today).reviews.length;
  const learned = bank.filter((item) => state.progress[item.id]).length;
  const reviewing =
    state.session?.mode === "review" && state.session.phase !== "complete";
  return (
    <section className="settings-card">
      <button className="back-button" onClick={onBack}>
        ← Về trang chính
      </button>
      <p className="eyebrow">ÔN LẠI BẤT CỨ LÚC NÀO</p>
      <h1 ref={heading} tabIndex={-1}>
        Ôn lại từ đã học
      </h1>
      {learned ? (
        <>
          <p>
            Bạn có {due} từ đến hạn ôn và {learned} từ đã học. Mình ưu tiên từ
            đến hạn trước nhé.
          </p>
          <div className="completion-actions">
            <button
              className="primary"
              disabled={!due && !reviewing}
              onClick={() => onStart(false)}
            >
              {reviewing ? "Tiếp tục ôn lại" : `Ôn ${due} từ đến hạn`}
            </button>
            <button className="secondary" onClick={() => onStart(true)}>
              Luyện tất cả {learned} từ đã học
            </button>
          </div>
          <p className="field-help">
            Ôn sớm là tùy chọn. Nếu bạn nhớ đúng, ngày ôn đã hẹn vẫn giữ nguyên.
            Nếu chưa nhớ, từ đó sẽ được ôn vào ngày mai.
          </p>
          {state.session &&
            state.session.phase !== "complete" &&
            state.session.mode !== "review" && (
              <p className="notice">
                Bài học đang dở sẽ được tạm giữ trong lúc bạn ôn lại.
              </p>
            )}
        </>
      ) : (
        <>
          <p>
            Bạn chưa học từ nào trong bộ này. Hãy bắt đầu bằng vài từ mới nhé.
          </p>
          <button className="primary" onClick={onLearn}>
            Bắt đầu học
          </button>
        </>
      )}
    </section>
  );
}
