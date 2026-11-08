import { VOCABULARY_SETS } from "../data/civicsVocabulary.js";
import {
  CIVICS_2025_SOURCE,
  officialQuestions,
  questionTranslations,
} from "../data/civics2025Examples.js";
import { adaptVocabulary, type SourceSet } from "./content-adapter.ts";
import type { TestVersion } from "./types.ts";
import audioManifest from "../content/audio-manifest.json" with { type: "json" };
import pronunciationVi from "../content/pronunciation-vi.json" with { type: "json" };
import finalSounds from "../content/final-sounds.json" with { type: "json" };
import civicsSource from "../data/civics.json" with { type: "json" };
import { adaptCivics, attachCivicsAnswers, validateCivicsAnswers, answerValidationFailed } from "./civics-adapter.ts";
import { findQuestionRecording, type AudioManifest } from "./recordings.ts";

// Local source modules are bundled by Next.js. No filesystem or Windows path at runtime.
const adapted = adaptVocabulary(
  VOCABULARY_SETS as SourceSet[],
  officialQuestions,
  questionTranslations,
  CIVICS_2025_SOURCE,
);
if (adapted.report.errors.length)
  throw new Error(
    "Invalid vocabulary source: " + adapted.report.errors.join("; "),
  );
const recordings: AudioManifest = audioManifest;
export const civicsQuestions = adaptCivics(civicsSource).questions;
export const civicsAnswerReport = validateCivicsAnswers(civicsSource,civicsQuestions);
if (answerValidationFailed(civicsAnswerReport)) throw new Error("Civics answers failed validation: "+JSON.stringify(civicsAnswerReport));
// Only supplied readings; never derive Vietnamese spellings from English letters.
const suppliedReadings: Record<string, string> = pronunciationVi;
const reviewedEndings: Record<
  string,
  { finalSound: string; headword: string; source: string }
> = finalSounds;
export const allItems = adapted.items.map(original => {
  const item=attachCivicsAnswers(original,civicsQuestions);
  return ({
  ...item,
  pronunciationVi: item.pronunciationVi ?? suppliedReadings[item.id],
  finalSound: item.finalSound ?? reviewedEndings[item.id]?.finalSound,
  audio: item.audio ?? recordings.words[item.id],
  ...findQuestionRecording(recordings, item.question, item.answer),
});});
export const contentReport = {...adapted.report,missingAnswers:allItems.filter(item=>!item.answers?.length).map(item=>item.id)};
export function getBank(version: TestVersion) {
  // No 2008 source was supplied. Never relabel 2025 questions as 2008.
  return allItems.filter((item) => item.sourceVersion === version);
}
