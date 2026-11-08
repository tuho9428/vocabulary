import type { RefObject } from "react";
import { dailyPlan, learnedToday } from "@/lib/engine";
import type { AppState, StudyItem } from "@/lib/types";

export function HomeScreen({
  state,
  bank,
  today,
  heading,
  onStart,
  onReview,
  onHelp,
}: {
  state: AppState;
  bank: StudyItem[];
  today: string;
  heading: RefObject<HTMLHeadingElement | null>;
  onStart: () => void;
  onReview: () => void;
  onHelp: () => void;
}) {
  const plan = dailyPlan(state, bank, today);
  const learned = bank.filter((item) => state.progress[item.id]);
  const countToday = learnedToday(state, bank, today);
  const unfinished = !!state.session && state.session.phase !== "complete";
  const dateLabel = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${today}T12:00:00`));
  return (
    <>
      <div className="welcome-row">
        <div>
          <p className="eyebrow">HỌC TIẾNG ANH · QUỐC TỊCH HOA KỲ</p>
          <h1 ref={heading} tabIndex={-1}>
            Chào bạn!
          </h1>
          <p className="intro">
            Mỗi ngày một chút. Bạn cứ học theo nhịp của mình.
          </p>
          {state.preferences.language === "bilingual" && (
            <p lang="en" className="bilingual-note">
              A little every day. Learn at your own pace.
            </p>
          )}
        </div>
        <span className="date-label">{dateLabel}</span>
      </div>
      {!bank.length && (
        <p className="notice">
          Chưa có dữ liệu cho bộ {state.preferences.testVersion}. Hãy nhờ người
          nhà chọn bộ 2025 trong cài đặt. Tiến độ cũ vẫn được giữ lại.
        </p>
      )}
      <div className="home-grid">
        <section className="daily-card" aria-labelledby="daily-title">
          <div className="section-top">
            <span className="pill">
              <span className="status-dot" />
              GỢI Ý HÔM NAY
            </span>
            <span className="quiet">Học theo nhịp của bạn</span>
          </div>
          <h2 id="daily-title">
            {unfinished
              ? "Mình học tiếp, bạn nhé."
              : "Một chút hôm nay,\nmột bước tiến mới."}
          </h2>
          <p className="card-description">
            {unfinished
              ? "Bài học đã được giữ lại. Bạn có thể tiếp tục từ chỗ đã dừng."
              : "Ôn từ cũ, học vài từ mới. Bạn có thể học thêm hoặc dừng lại bất cứ lúc nào."}
          </p>
          <div className="lesson-counts">
            <div>
              <span className="count-number">
                {plan.reviews.length.toString().padStart(2, "0")}
              </span>
              <span>từ đến hạn ôn</span>
            </div>
            <span className="count-divider" />
            <div>
              <span className="count-number">
                {plan.newItems.length.toString().padStart(2, "0")}
              </span>
              <span>từ mới gợi ý</span>
            </div>
          </div>
          <button className="primary start-button" onClick={onStart}>
            {unfinished ? "Tiếp tục học" : "Bắt đầu học"}
            <span aria-hidden="true">→</span>
          </button>
          <button className="secondary home-review" onClick={onReview}>
            Ôn lại
          </button>
          <p className="save-note">
            <span aria-hidden="true">✓</span> Tiến độ tự lưu trên thiết bị này
          </p>
        </section>
        <aside className="journey-card" aria-labelledby="journey-title">
          <div className="section-top">
            <span className="eyebrow">HÀNH TRÌNH CỦA BẠN</span>
            <span className="seed-symbol" aria-hidden="true">
              ✳
            </span>
          </div>
          <h2 id="journey-title">
            Từng từ nhỏ,
            <br />
            thêm tự tin.
          </h2>
          <div className="learned-number">
            {learned.length.toString().padStart(2, "0")}
            <span>/ {bank.length}</span>
          </div>
          <p className="journey-caption">từ đã học</p>
          <progress
            aria-label="Số từ đã học"
            value={learned.length}
            max={Math.max(bank.length, 1)}
          />
          <p className="journey-encouragement">
            <strong>{countToday} từ mới hôm nay.</strong>
            <br />
            Ba từ là gợi ý, không phải giới hạn. Mỗi lần ôn lại giúp bạn nhớ lâu
            hơn.
          </p>
          <div className="bank-label">
            Bộ {state.preferences.testVersion}
            <span>{bank.length ? "Dữ liệu nguồn" : "Chưa có dữ liệu"}</span>
          </div>
        </aside>
      </div>
      <section className="how-section" aria-labelledby="how-title">
        <div className="how-heading">
          <h2 id="how-title">Mình sẽ học như thế nào?</h2>
          <span>Ba bước thật nhẹ nhàng</span>
        </div>
        <ol className="steps">
          <li>
            <span className="step-number">1</span>
            <div>
              <h3>Ôn lại từ cũ</h3>
              <p>Ưu tiên từ đến hạn ôn.</p>
            </div>
          </li>
          <li>
            <span className="step-number">2</span>
            <div>
              <h3>Học một vài từ mới</h3>
              <p>Nghe rõ, hiểu bằng tiếng Việt.</p>
            </div>
          </li>
          <li>
            <span className="step-number">3</span>
            <div>
              <h3>Tự chọn bước tiếp theo</h3>
              <p>Ôn lại, học thêm hoặc nghỉ.</p>
            </div>
          </li>
        </ol>
      </section>
      <div className="reassurance">
        <span className="heart-symbol" aria-hidden="true">
          ♡
        </span>
        <p>
          Hôm nào bận cũng không sao.
          <br />
          <strong>Mình cứ tiếp tục khi bạn sẵn sàng.</strong>
        </p>
        <button className="help-link" onClick={onHelp}>
          Hướng dẫn sử dụng <span aria-hidden="true">↗</span>
        </button>
      </div>
    </>
  );
}
