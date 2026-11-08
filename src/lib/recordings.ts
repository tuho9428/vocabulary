export type RecordingEntry = {
  question: string;
  questionAudio?: string;
  answer?: string;
  answerAudio?: string;
};
export type AudioManifest = {
  words: Record<string, string>;
  questions: RecordingEntry[];
};

// Whitespace normalization only: do not equate differently worded questions,
// translate text, or assume the two datasets use the same question numbers.
export const audioTextKey = (text: string) => text.trim().replace(/\s+/g, " ");

export function findQuestionRecording(
  manifest: AudioManifest,
  question: string | undefined,
  answer?: string,
) {
  const match = question
    ? manifest.questions.find(
        (entry) => audioTextKey(entry.question) === audioTextKey(question),
      )
    : undefined;
  return {
    questionAudio: match?.questionAudio,
    // A recording must also match the answer already approved for this item.
    // The unversioned JSON is an audio index, not a replacement question bank.
    answerAudio:
      answer &&
      match?.answer &&
      audioTextKey(answer) === audioTextKey(match.answer)
        ? match.answerAudio
        : undefined,
  };
}

export function isLocalAudioPath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\/audio\/[a-zA-Z0-9/_-]+\.(mp3|wav|ogg|m4a)$/.test(value)
  );
}
