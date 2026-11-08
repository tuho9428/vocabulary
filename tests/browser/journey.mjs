// Run each stage in an isolated Chrome context at localhost:3000.
// Reload between "interrupt" and "finish-first"; change Date before "next-day".
// No storage is cleared here. The first stage refuses an existing learner profile.
export async function runJourneyAudit(stage) {
  const key = "cung-ong-hoc:v1";
  const state = () => JSON.parse(localStorage.getItem(key));
  const main = () => document.querySelector("main").innerText;
  const assert = (condition, message) => { if (!condition) throw Error(message); };
  const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const button = text => [...document.querySelectorAll("main button")].find(b => b.textContent.trim().replace(/^♪\s*/, "").startsWith(text));
  const click = async text => {
    const target = button(text);
    assert(target && !target.disabled, `Missing enabled button: ${text}`);
    target.click();
    await settle();
  };
  const remember = async () => {
    await click("Hiện đáp án");
    await click("Nhớ rồi");
    await click("Tiếp tục");
  };
  const newWord = async () => { await click("Đã học"); await click("Tiếp tục"); };
  const questions = async () => {
    const answers = [];
    while (state().session.phase === "practice") {
      const index = state().session.practiceIndex;
      await click("Hiện đáp án");
      assert(!document.querySelector(".practice-card a"), "Source control leaked into lesson");
      const shown = [...document.querySelectorAll(".answer-area h2")].map(h => h.textContent);
      assert(shown.length, "Missing official answers");
      answers.push(shown);
      if (document.querySelector(".accepted-answers summary")) {
        document.querySelector(".accepted-answers summary").click();
        await settle();
      }
      const continueButton = button("Tiếp tục");
      continueButton.click();
      continueButton.click(); // Repeated taps on the same control must not skip a question.
      await settle();
      assert(state().session.practiceIndex === index + 1, "Repeated tap advanced twice");
    }
    return answers;
  };
  if (stage === "interrupt") {
    assert(!state(), "Use a new isolated context; existing progress must not be replaced");
    await click("Ôn lại");
    assert(main().includes("Bạn chưa học từ nào"), "Empty review guidance missing");
    await click("Bắt đầu học");
    assert(main().includes("Quát") && main().includes("gì / cái gì"), "Learning reading/meaning missing");
    await click("Nghe phát âm");
    await newWord();
    assert(state().session.cursor === 1, "First word not saved immediately");
    assert(Object.keys(state().progress).length === 1, "Unexpected learned count");
    return { stage, cursor: 1, learned: 1, nextReview: Object.values(state().progress)[0].nextReview };
  }
  if (stage === "finish-first") {
    assert(state().session.cursor === 1 && main().includes("who"), "Refresh did not restore the second word");
    await newWord();
    await newWord();
    const before = JSON.stringify(state().progress);
    const answers = await questions();
    assert(JSON.stringify(state().progress) === before, "Civics changed vocabulary scheduling");
    assert(state().session.phase === "complete", "First lesson did not complete");
    return { stage, learned: Object.keys(state().progress).length, answers };
  }
  if (stage === "early-review") {
    await click("Ôn lại");
    assert(button("Ôn 0 từ đến hạn").disabled, "No-due review is enabled");
    const before = state().progress;
    await click("Luyện tất cả");
    while (state().session.phase === "study") {
      assert(document.querySelector(".pronunciation-vi"), "Hidden review reading");
      assert(button("Nghe phát âm") && !document.querySelector(".vocabulary-answer"), "Meaning-only recall broken");
      assert(!/Âm cuối|Không thêm tờ/.test(main()), "Ending explanation appeared");
      await remember();
    }
    const after = state().progress;
    assert(Object.keys(before).every(id => before[id].nextReview === after[id].nextReview && before[id].intervalIndex === after[id].intervalIndex), "Early review postponed a due date");
    return { stage, learned: Object.keys(after).length, schedulesPreserved: true };
  }
  if (stage === "paused-extra") {
    await click("Học thêm");
    const queue = state().session.queue;
    assert(queue.every(e => !state().progress[e.id]), "Previously learned word introduced again");
    await newWord();
    const paused = state().session;
    await click("← Về");
    await click("Ôn lại");
    await click("Luyện tất cả");
    while (state().session.phase === "study") await remember();
    await click("← Về");
    assert(button("Tiếp tục học"), "Paused lesson is not labelled as resumable");
    await click("Tiếp tục học");
    assert(JSON.stringify(state().session) === JSON.stringify(paused), "Wrong paused lesson resumed");
    while (state().session.phase === "study") await newWord();
    await questions();
    assert(Object.keys(state().progress).length === 6, "Extra learning was capped at three per day");
    await click("Hoàn thành");
    return { stage, learned: 6, resumedCursor: paused.cursor, queue };
  }
  if (stage === "next-day") {
    const before = state().progress;
    await click("Bắt đầu học");
    const queue = state().session.queue;
    assert(queue.filter(e => e.kind === "review").length === 6, "Next-day reviews missing");
    assert(queue.filter(e => e.kind === "new").length === 1, "Daily recommendation with six reviews is wrong");
    const forgotten = queue[0].id;
    await click("Hiện đáp án");
    await click("Chưa nhớ");
    await click("Tiếp tục");
    assert(!document.querySelector(".vocabulary-answer"), "Next review meaning is exposed");
    while (state().session.phase === "study") {
      const entry = state().session.queue[state().session.cursor];
      if (entry.kind === "new") await newWord(); else await remember();
    }
    await questions();
    const after = state().progress;
    assert(after[forgotten].intervalIndex === 0 && after[forgotten].nextReview === "2026-11-10", "Forgotten-word retry did not retain tomorrow's review");
    assert(Object.keys(before).filter(id => id !== forgotten).every(id => after[id].nextReview === "2026-11-12"), "Successful due reviews did not advance three days");
    return { stage, learned: Object.keys(after).length, forgottenDue: after[forgotten].nextReview, reviews: 6, newWords: 1 };
  }
  if (stage === "audio-failure") {
    if (!button("Học thêm") && button("Bắt đầu học")) await click("Bắt đầu học");
    await click("Học thêm");
    const descriptor = Object.getOwnPropertyDescriptor(window, "speechSynthesis");
    try {
      Object.defineProperty(window, "speechSynthesis", { configurable: true, value: undefined });
      await click("Nghe phát âm");
      assert(main().includes("Thiết bị chưa phát được âm thanh"), "Audio failure is silent");
      await newWord();
      assert(!main().includes("Thiết bị chưa phát được âm thanh"), "Old audio error leaked into the next card");
      return { stage, failureShown: true, clearedOnNextCard: true };
    } finally {
      if (descriptor) Object.defineProperty(window, "speechSynthesis", descriptor);
      else delete window.speechSynthesis;
    }
  }
  throw Error(`Unknown audit stage: ${stage}`);
}
