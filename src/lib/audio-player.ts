export type AudioHandle = {
  playbackRate: number;
  currentTime: number;
  play: () => Promise<void>;
  pause: () => void;
  addEventListener: (event: "error" | "ended", callback: () => void) => void;
  removeEventListener: (event: "error" | "ended", callback: () => void) => void;
};
type Dependencies = {
  createAudio: (src: string) => AudioHandle;
  speak: (text: string, rate: number, onError: () => void) => void;
  cancelSpeech: () => void;
};

// Kept separate from React/browser globals so failure and cancellation are testable.
export function createAudioPlayer(dependencies: Dependencies) {
  let generation = 0;
  let current: AudioHandle | undefined;
  let cleanup: (() => void) | undefined;
  function clearRecording() {
    cleanup?.();
    cleanup = undefined;
    if (current) {
      current.pause();
      try {
        current.currentTime = 0;
      } catch {
        /* Some devices reject seeking before metadata loads. */
      }
      current = undefined;
    }
  }
  function stop() {
    generation++;
    clearRecording();
    dependencies.cancelSpeech();
  }
  function play(
    text: string,
    rate: number,
    onError: () => void,
    src?: string,
    onFallback?: () => void,
  ) {
    stop();
    const request = generation;
    const speak = () =>
      dependencies.speak(text, rate, () => {
        if (request === generation) onError();
      });
    if (!src) {
      speak();
      return;
    }
    let fellBack = false;
    const fallback = () => {
      if (request !== generation || fellBack) return;
      fellBack = true;
      clearRecording();
      onFallback?.();
      speak();
    };
    try {
      const audio = dependencies.createAudio(src);
      current = audio;
      audio.playbackRate = rate;
      const ended = () => {
        if (request === generation) clearRecording();
      };
      audio.addEventListener("error", fallback);
      audio.addEventListener("ended", ended);
      cleanup = () => {
        audio.removeEventListener("error", fallback);
        audio.removeEventListener("ended", ended);
      };
      void audio.play().catch(fallback);
    } catch {
      fallback();
    }
  }
  return { play, stop };
}
