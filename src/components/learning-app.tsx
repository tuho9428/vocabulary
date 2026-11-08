"use client";

import { useEffect, useRef, useState } from "react";
import { allItems, getBank } from "@/lib/content";
import {
  answerWord,
  finishPractice,
  finishSession,
  initialState,
  startSession,
} from "@/lib/engine";
import { localDate } from "@/lib/dates";
import { loadProgress, saveProgress, STORAGE_KEY } from "@/lib/storage";
import { playEnglishAudio, stopAudio } from "@/lib/audio";
import type { AppState, SessionMode } from "@/lib/types";
import { viewFromHash, type View } from "@/lib/navigation";

import { Settings } from "./family-settings";
import { HomeScreen } from "./home-screen";
import { LessonScreen } from "./lesson-screen";
import { ReviewScreen } from "./review-screen";

// Access localStorage inside the adapter so blocked storage getters are caught too.
const browserStorage = {
  getItem: (key: string) => window.localStorage.getItem(key),
  setItem: (key: string, value: string) =>
    window.localStorage.setItem(key, value),
};

function BookMark({ small = false }: { small?: boolean }) {
  return (
    <span aria-hidden="true" className={`book-mark ${small ? "small" : ""}`}>
      <span />
      <span />
    </span>
  );
}

export function LearningApp() {
  const [state, setState] = useState<AppState>(initialState);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("home");
  const [today, setToday] = useState(localDate);
  const [notice, setNotice] = useState("");
  const [audioNotice, setAudioNotice] = useState("");
  const [conflict, setConflict] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [saved, setSaved] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const heading = useRef<HTMLHeadingElement>(null);
  const hydrated = useRef(false);
  const writesBlocked = useRef(false);
  const initialNavigation = useRef<{ view: View; addHome: boolean } | null>(null);
  const hasSession = !!state.session;

  useEffect(() => {
    // Strict Mode repeats effect setup in development. Run migration once so
    // its explanation isn't immediately replaced by a second, already-upgraded load.
    if (!hydrated.current) {
      const loaded = loadProgress(browserStorage, allItems);
      hydrated.current = true;
      setState(loaded.state);
      setNotice(loaded.notice);
      writesBlocked.current = !!loaded.writeBlocked;
      setStorageAvailable(!loaded.writeBlocked);
      setReady(true);
      const restoredView = viewFromHash(window.location.hash, !!loaded.state.session);
      const initialView = restoredView ??
        (loaded.state.session && loaded.state.session.phase !== "complete" ? "lesson" : "home");
      initialNavigation.current = { view: initialView, addHome: !restoredView && initialView === "lesson" };
      setView(initialView);
    }
    const refreshDate = () => setToday(localDate());
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) setConflict(true);
    };
    window.addEventListener("focus", refreshDate);
    document.addEventListener("visibilitychange", refreshDate);
    window.addEventListener("storage", onStorage);
    const timer = window.setInterval(refreshDate, 30_000);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refreshDate);
      document.removeEventListener("visibilitychange", refreshDate);
      window.removeEventListener("storage", onStorage);
      stopAudio();
    };
  }, []);

  useEffect(() => {
    if (!ready || !initialNavigation.current) return;
    const navigation = initialNavigation.current;
    initialNavigation.current = null;
    // Run after hydration, when Next's History API integration is installed.
    // Passing null lets Next copy its own state and synchronize the current URL.
    if (navigation.addHome) {
      window.history.replaceState(null, "", "#home");
      window.history.pushState(null, "", "#lesson");
    } else {
      window.history.replaceState(null, "", `#${navigation.view}`);
    }
  }, [ready]);

  useEffect(() => {
    const onBackOrForward = () => {
      // The skip link moves focus within the current screen, not to home.
      if (window.location.hash === "#main") return;
      stopAudio();
      setAudioNotice("");
      setRevealed(false);
      setFeedback("");
      setView(viewFromHash(window.location.hash, hasSession) ?? "home");
    };
    window.addEventListener("popstate", onBackOrForward);
    return () => window.removeEventListener("popstate", onBackOrForward);
  }, [hasSession]);

  useEffect(() => {
    heading.current?.focus();
  }, [
    view,
    state.session?.cursor,
    state.session?.phase,
    state.session?.practiceIndex,
    feedback,
  ]);

  function commit(next: AppState) {
    if (conflict) return;
    const success = saveProgress(browserStorage, next, writesBlocked.current);
    setSaved(success);
    setStorageAvailable(success);
    if (!success && !writesBlocked.current)
      setNotice(
        "Chưa lưu được tiến độ. Hãy nhờ người nhà kiểm tra dung lượng và quyền lưu của trình duyệt trước khi đóng trang.",
      );
    setState(next);
  }

  function go(next: View) {
    stopAudio();
    setAudioNotice("");
    setView(next);
    if (window.location.hash !== `#${next}`)
      window.history.pushState(null, "", `#${next}`);
    setRevealed(false);
    setFeedback("");
  }

  function play(text: string, recording?: string) {
    setAudioNotice("");
    playEnglishAudio(
      text,
      state.preferences.speechRate,
      () =>
        setAudioNotice(
          "Thiết bị chưa phát được âm thanh. Bạn có thể đọc chữ trên thẻ hoặc nhờ người nhà kiểm tra âm lượng và giọng đọc tiếng Anh.",
        ),
      recording,
      () =>
        setAudioNotice(
          "Chưa phát được bản thu. Đang dùng giọng đọc của trình duyệt.",
        ),
    );
  }

  const bank = getBank(state.preferences.testVersion);
  const session = state.session;
  const unfinished =
    (!!session && session.phase !== "complete") || !!state.pausedSession;

  function begin(mode: SessionMode = "daily", includeEarly = false) {
    const actualToday = localDate();
    setToday(actualToday);
    commit(startSession(state, bank, actualToday, mode, includeEarly));
    go("lesson");
  }

  function recall(remembered: boolean) {
    commit(answerWord(state, remembered, localDate()));
    setFeedback(
      remembered
        ? "Tốt lắm! Mình tiếp tục nhé."
        : "Không sao đâu bạn. Mình sẽ gặp lại từ này và ôn tiếp vào ngày mai.",
    );
    setRevealed(false);
    setAudioNotice("");
    stopAudio();
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Đến nội dung chính
      </a>
      <header className="site-header">
        <div className="brand">
          <BookMark />
          <div>
            <span className="brand-name">
              Cùng bạn học<span className="brand-dot">.</span>
            </span>
            <span className="brand-subtitle">MỖI NGÀY MỘT CHÚT</span>
          </div>
        </div>
        <span className="header-note">Chậm rãi học, vững vàng nhớ.</span>
        <button className="family-link" onClick={() => go("family")}>
          <span aria-hidden="true">⚙</span>
          <span>Dành cho người nhà</span>
        </button>
      </header>

      <main id="main" className="main-content">
        {notice && (
          <div role="status" className="notice">
            {notice}
          </div>
        )}
        {conflict && (
          <div role="alert" className="notice">
            Tiến độ đã thay đổi ở trang khác. Hãy tải lại để dùng bản mới nhất.{" "}
            <button
              className="text-button"
              onClick={() => window.location.reload()}
            >
              Tải lại trang
            </button>
          </div>
        )}
        {!ready ? (
          <div className="loading" role="status">
            Đang chuẩn bị bài học…
          </div>
        ) : (
          <fieldset className="app-fieldset" disabled={conflict}>
            {view === "home" && (
              <HomeScreen
                state={state}
                bank={bank}
                today={today}
                heading={heading}
                onStart={() => begin()}
                onReview={() => go("review")}
                onHelp={() => go("help")}
                storageAvailable={storageAvailable}
              />
            )}
            {view === "review" && (
              <ReviewScreen
                state={state}
                bank={bank}
                today={today}
                heading={heading}
                onBack={() => go("home")}
                onStart={(includeEarly) => begin("review", includeEarly)}
                onLearn={() => begin()}
              />
            )}
            {view === "lesson" && session && (
              <LessonScreen
                state={state}
                bank={bank}
                today={today}
                heading={heading}
                feedback={feedback}
                saved={saved}
                revealed={revealed}
                audioNotice={audioNotice}
                onBack={() => go("home")}
                onReview={() => go("review")}
                onExtra={() => begin("extra")}
                onFinish={() => {
                  commit(finishSession(state));
                  go("home");
                }}
                onContinue={() => {
                  setFeedback("");
                  setAudioNotice("");
                }}
                onReveal={() => setRevealed(true)}
                onRecall={recall}
                onPractice={() => {
                  commit(finishPractice(state));
                  setRevealed(false);
                  setAudioNotice("");
                  stopAudio();
                }}
                onPlay={play}
              />
            )}

            {view === "family" && (
              <section className="settings-card">
                <button className="back-button" onClick={() => go("home")}>
                  ← Về trang chính
                </button>
                <p className="eyebrow">CÀI ĐẶT GIA ĐÌNH</p>
                <h1 ref={heading} tabIndex={-1}>
                  Phần dành cho người nhà
                </h1>
                <p>
                  Người nhà giúp chọn bộ đề, số từ mỗi ngày và tốc độ đọc. Bạn
                  không cần thay đổi phần này để học.
                </p>
                <button className="primary" onClick={() => go("settings")}>
                  Tôi là người nhà, mở cài đặt
                </button>
              </section>
            )}

            {view === "settings" && (
              <Settings
                state={state}
                unfinished={unfinished}
                heading={heading}
                onBack={() => go("home")}
                onSave={(preferences) => {
                  const changed =
                    preferences.testVersion !== state.preferences.testVersion;
                  commit({
                    ...state,
                    preferences,
                    session: changed ? null : state.session,
                  });
                  go("home");
                }}
              />
            )}

            {view === "help" && (
              <section className="settings-card">
                <button className="back-button" onClick={() => go("home")}>
                  ← Về trang chính
                </button>
                <p className="eyebrow">HƯỚNG DẪN</p>
                <h1 ref={heading} tabIndex={-1}>
                  Cứ từng bước, bạn nhé.
                </h1>
                <ol className="help-steps">
                  <li>
                    Nhấn <strong>Bắt đầu học</strong>. Nếu có bài đang dở, nhấn{" "}
                    <strong>Tiếp tục học</strong>.
                  </li>
                  <li>
                    Nhấn <strong>Nghe phát âm</strong> để nghe từ tiếng Anh. Bạn
                    có thể nghe bao nhiêu lần cũng được.
                  </li>
                  <li>
                    Khi ôn, thử nhớ nghĩa rồi nhấn <strong>Hiện đáp án</strong>.
                    Chọn <strong>Nhớ rồi</strong> hoặc <strong>Chưa nhớ</strong>
                    .
                  </li>
                  <li>
                    Nghe câu hỏi và xem nghĩa tiếng Việt. Tiến độ tự lưu khi bạn
                    hoàn thành mỗi thẻ.
                  </li>
                </ol>
                <p>
                  Sau mỗi lượt, chọn <strong>Ôn lại</strong>,{" "}
                  <strong>Học thêm</strong> hoặc <strong>Hoàn thành</strong>. Ba
                  từ là gợi ý, không phải giới hạn.
                </p>
                <p>
                  Không cần học bù nếu bỏ lỡ một ngày. Chỉ cần mở lại và tiếp
                  tục.
                </p>
                <div className="notice">
                  Dữ liệu nằm trong trình duyệt trên thiết bị này. Xóa dữ liệu
                  trình duyệt sẽ xóa tiến độ. Không có thông báo tự động khi
                  đóng ứng dụng.
                </div>
                <button className="primary" onClick={() => go("home")}>
                  Đã hiểu, về trang chính
                </button>
              </section>
            )}
          </fieldset>
        )}
      </main>
      <footer className="site-footer">
        <div>
          <BookMark small />
          <span>Cùng bạn học · Từng ngày, cùng nhau.</span>
        </div>
        <p>
          Bộ {state.preferences.testVersion} · Từ vựng và câu hỏi từ dữ liệu
          nguồn
        </p>
      </footer>
    </div>
  );
}
