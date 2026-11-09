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
  speak: (text: string, rate: number, onError: () => void, onEnd?: () => void) => void;
  cancelSpeech: () => void;
};

// Kept separate from React/browser globals so failure and cancellation are testable.
export function createAudioPlayer(dependencies: Dependencies) {
  let generation = 0;
  let current: AudioHandle | undefined;
  let cleanup: (() => void) | undefined;
  let reportStopped: (() => void) | undefined;
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
    reportStopped?.();
    reportStopped = undefined;
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
    onStatus?: (playing: boolean) => void,
  ) {
    stop();
    const request = generation;
    const endedStatus = () => {
      if (request !== generation) return;
      reportStopped = undefined;
      onStatus?.(false);
    };
    reportStopped = endedStatus;
    onStatus?.(true);
    const speak = () =>
      dependencies.speak(text, rate, () => {
        if (request !== generation) return;
        endedStatus();
        onError();
      }, endedStatus);
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
        if (request !== generation) return;
        clearRecording();
        endedStatus();
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
