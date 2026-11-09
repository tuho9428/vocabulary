import { createAudioPlayer } from "./audio-player.ts";

export function speakEnglish(
  text: string,
  rate: number,
  onError: () => void,
  onEnd?: () => void,
): void {
  if (
    !("speechSynthesis" in window) ||
    !("SpeechSynthesisUtterance" in window)
  ) {
    onError();
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice =
      window.speechSynthesis
        .getVoices()
        .find((voice) => voice.lang === "en-US") ??
      window.speechSynthesis
        .getVoices()
        .find((voice) => voice.lang.startsWith("en"));
    if (voice) utterance.voice = voice;
    utterance.lang = "en-US";
    utterance.rate = rate;
    utterance.onend = () => onEnd?.();
    utterance.onerror = (event) => {
      if (event.error !== "canceled" && event.error !== "interrupted")
        onError();
    };
    window.speechSynthesis.speak(utterance);
  } catch {
    onError();
  }
}

// Construction is safe during SSR: browser APIs are only accessed on playback.
const player = createAudioPlayer({
  createAudio: (src) => new Audio(src),
  speak: speakEnglish,
  cancelSpeech: () => window.speechSynthesis?.cancel(),
});
export const playEnglishAudio = player.play;
export const stopAudio = player.stop;
