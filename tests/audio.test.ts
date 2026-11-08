import test from "node:test";
import assert from "node:assert/strict";
import {
  createAudioPlayer,
  type AudioHandle,
} from "../src/lib/audio-player.ts";

function fixture() {
  const audios: (AudioHandle & {
    src: string;
    paused: boolean;
    emit: (event: "error" | "ended") => void;
  })[] = [];
  const speech: { text: string; rate: number; onError: () => void }[] = [];
  let rejectNext: ((reason: Error) => void) | undefined;
  let pending = false;
  const player = createAudioPlayer({
    createAudio: (src) => {
      const listeners = {
        error: new Set<() => void>(),
        ended: new Set<() => void>(),
      };
      const audio = {
        src,
        paused: true,
        playbackRate: 1,
        currentTime: 0,
        pause() {
          this.paused = true;
        },
        play() {
          this.paused = false;
          return pending
            ? new Promise<void>((_, reject) => {
                rejectNext = reject;
              })
            : Promise.resolve();
        },
        addEventListener(event: "error" | "ended", fn: () => void) {
          listeners[event].add(fn);
        },
        removeEventListener(event: "error" | "ended", fn: () => void) {
          listeners[event].delete(fn);
        },
        emit(event: "error" | "ended") {
          for (const fn of [...listeners[event]]) fn();
        },
      };
      audios.push(audio);
      return audio;
    },
    speak: (text, rate, onError) => speech.push({ text, rate, onError }),
    cancelSpeech: () => {},
  });
  return {
    player,
    audios,
    speech,
    setPending: () => {
      pending = true;
    },
    reject: () => rejectNext!(new Error("failed")),
  };
}

test("recorded audio takes priority over browser speech and uses the chosen rate", async () => {
  const f = fixture();
  f.player.play("Question?", 0.75, () => assert.fail(), "/audio/question.mp3");
  assert.equal(f.audios[0].src, "/audio/question.mp3");
  assert.equal(f.audios[0].playbackRate, 0.75);
  assert.equal(f.audios[0].paused, false);
  assert.equal(f.speech.length, 0);
  f.audios[0].emit("ended");
  assert.equal(f.audios[0].paused, true);
});
test("missing recordings use browser speech directly", () => {
  const f = fixture();
  f.player.play("citizen", 0.5, () => {});
  assert.equal(f.audios.length, 0);
  assert.equal(f.speech[0].text, "citizen");
  assert.equal(f.speech[0].rate, 0.5);
});
test("unavailable/corrupt recordings fall back only once even if play also rejects", async () => {
  const f = fixture();
  f.setPending();
  let notices = 0;
  f.player.play(
    "Question?",
    0.75,
    () => {},
    "/audio/broken.mp3",
    () => {
      notices++;
    },
  );
  f.audios[0].emit("error");
  f.reject();
  await Promise.resolve();
  assert.equal(f.speech.length, 1);
  assert.equal(notices, 1);
  assert.equal(f.audios[0].paused, true);
});
test("navigation cancels pending playback without starting delayed fallback speech", async () => {
  const f = fixture();
  f.setPending();
  f.player.play("old", 1, () => assert.fail(), "/audio/old.mp3");
  f.player.stop();
  f.reject();
  await Promise.resolve();
  assert.equal(f.speech.length, 0);
  assert.equal(f.audios[0].paused, true);
});
test("repeated taps stop the earlier recording and its late events are ignored", () => {
  const f = fixture();
  f.player.play("old", 1, () => assert.fail(), "/audio/old.mp3");
  f.player.play("new", 1, () => assert.fail(), "/audio/new.mp3");
  f.audios[0].emit("error");
  assert.equal(f.audios[0].paused, true);
  assert.equal(f.audios[1].paused, false);
  assert.equal(f.speech.length, 0);
});
test("late speech errors after navigation do not replace the next screen's message", () => {
  const f = fixture();
  let errors = 0;
  f.player.play("old", 1, () => {
    errors++;
  });
  f.player.stop();
  f.speech[0].onError();
  assert.equal(errors, 0);
});
