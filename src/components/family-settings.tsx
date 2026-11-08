"use client";

import { useState } from "react";
import type { AppState, Preferences } from "@/lib/types";

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
        Bộ từ vựng hiện có 152 từ và 87 câu hỏi tiếng Anh thuộc phiên bản 2025.
        Bộ câu hỏi gia đình có thêm 100 câu kèm đáp án, chưa ghi phiên bản đề.
        Ứng dụng chỉ ghép đáp án khi nội dung câu hỏi khớp; giữ riêng nguồn và
        số câu của từng bộ.
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
            Giữ nguyên từ, nghĩa tiếng Việt, cách đọc và câu hỏi từ bộ dữ liệu
            đã cung cấp (M-1778, 09/25). Bản thu chỉ được ghép khi khớp đúng nội
            dung câu hỏi. Đáp án gia đình được giữ nguyên từ civics.json và ghi
            rõ nguồn; các câu hỏi không khớp vẫn cần đối chiếu tài liệu USCIS.
          </p>
          <a
            href="https://www.uscis.gov/citizenship/find-study-materials-and-resources"
            target="_blank"
            rel="noreferrer"
          >
            Tài liệu học chính thức từ USCIS ↗
          </a>
        </div>
        <button className="primary" type="submit">
          Lưu cài đặt
        </button>
      </form>
    </section>
  );
}
