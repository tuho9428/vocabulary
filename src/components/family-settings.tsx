"use client";

import { useState } from "react";
import type { AppState, Preferences } from "@/lib/types";
import { official2025Questions } from "@/lib/content";
import { USCIS_2025_URL, USCIS_UPDATES_URL } from "@/lib/uscis-2025-source";

export function Settings({
  state,
  unfinished,
  heading,
  onBack,
  onSave,
}: {
  state: AppState;
  unfinished: boolean;
  heading: React.RefObject<HTMLHeadingElement | null>;
  onBack: () => void;
  onSave: (preferences: Preferences) => void;
}) {
  const [version, setVersion] = useState(state.preferences.testVersion);
  return (
    <section className="settings-card">
      <button className="back-button" onClick={onBack}>
        ← Về trang chính
      </button>
      <p className="eyebrow">DÀNH CHO NGƯỜI NHÀ</p>
      <h1 ref={heading} tabIndex={-1}>
        Cài đặt bài học
      </h1>
      <p>
        Bộ từ vựng có 152 từ. Bộ đề USCIS 2025 có đủ 128 câu hỏi:
        120 câu có đáp án cố định và 8 câu cần thông tin hiện tại hoặc nơi ở.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          onSave({
            testVersion: unfinished ? state.preferences.testVersion : version,
            language: data.get("language") as Preferences["language"],
            newWordsPerDay: Number(data.get("newWordsPerDay")) as 1 | 2 | 3,
            speechRate: Number(data.get("speechRate")),
          });
        }}
      >
        <label htmlFor="version">Phiên bản bộ đề</label>
        <select
          id="version"
          value={version}
          onChange={(event) =>
            setVersion(event.target.value as Preferences["testVersion"])
          }
          disabled={unfinished}
          aria-describedby="version-help"
        >
          <option value="2008">2008 · Chưa có dữ liệu nguồn</option>
          <option value="2025">2025 · 152 từ</option>
        </select>
        <p id="version-help" className="field-help">
          {unfinished
            ? "Hãy hoàn thành bài đang học trước khi đổi bộ đề."
            : "Đổi bộ đề không xóa tiến độ. Các phiên bản không trộn câu hỏi hoặc lịch ôn."}
        </p>
        <label htmlFor="newWordsPerDay">Số từ mới gợi ý mỗi lượt</label>
        <select
          id="newWordsPerDay"
          name="newWordsPerDay"
          defaultValue={state.preferences.newWordsPerDay}
        >
          <option value="1">1 từ · Thật chậm rãi</option>
          <option value="2">2 từ · Nhẹ nhàng</option>
          <option value="3">3 từ · Từng bước đều đặn</option>
        </select>
        <p className="field-help">
          Nếu có 5–9 từ cần ôn: tối đa 1 từ mới. Từ 10 từ cần ôn: chỉ ôn từ cũ.
          Đây là gợi ý cho lượt học hằng ngày. Sau đó, bạn vẫn có thể chọn Học
          thêm nhiều lần, mỗi lượt 1–3 từ.
        </p>
        <label htmlFor="language">Ngôn ngữ hỗ trợ</label>
        <select
          id="language"
          name="language"
          defaultValue={state.preferences.language}
        >
          <option value="vi">Tiếng Việt</option>
          <option value="bilingual">Tiếng Việt + chú thích tiếng Anh</option>
        </select>
        <p className="field-help">
          Giao diện luôn ưu tiên tiếng Việt; từ vựng và câu hỏi luôn có tiếng
          Anh.
        </p>
        <label htmlFor="speechRate">Tốc độ nghe tiếng Anh</label>
        <select
          id="speechRate"
          name="speechRate"
          defaultValue={state.preferences.speechRate}
        >
          <option value="0.5">Rất chậm</option>
          <option value="0.75">Chậm (khuyên dùng)</option>
          <option value="1">Bình thường</option>
        </select>
        <p className="field-help">
          Ưu tiên bản thu có sẵn. Nếu chưa có bản thu hoặc không phát được, ứng
          dụng dùng giọng đọc của trình duyệt. Tốc độ này áp dụng cho cả bản thu
          và giọng đọc. Âm thanh có thể cần mạng.
        </p>
        <div className="notice">
          <strong>Dữ liệu nguồn · USCIS 2025</strong>
          <p>
            Câu hỏi và các đáp án tiếng Anh lấy từ USCIS M-1778 (09/25).
            Bản dịch tiếng Việt là phần hỗ trợ học tập đã có trong ứng dụng.
            Bộ 100 câu gia đình được giữ riêng, không dùng làm đáp án cho bộ 2025.
          </p>
          <a
            href={USCIS_2025_URL}
            target="_blank"
            rel="noreferrer"
          >
            Tài liệu học chính thức từ USCIS ↗
          </a>
          <p>
            Các câu dưới đây chưa được đưa vào lượt luyện câu hỏi. Hãy nhờ người nhà
            xác minh thông tin đúng với nơi ở và ngày phỏng vấn; ứng dụng không lưu sẵn tên người đương nhiệm.
          </p>
          <ul className="dynamic-question-list">
            {official2025Questions.filter(q => q.dynamic).map(q => (
              <li key={q.id}>
                <strong>Câu {q.number}</strong>: <span lang="en">{q.question}</span>
              </li>
            ))}
          </ul>
          <a href={USCIS_UPDATES_URL} target="_blank" rel="noreferrer">Kiểm tra đáp án hiện tại tại USCIS ↗</a>
        </div>
        <button className="primary" type="submit">
          Lưu cài đặt
        </button>
      </form>
    </section>
  );
}
