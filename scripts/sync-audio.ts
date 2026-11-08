import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { VOCABULARY_SETS } from "../src/data/civicsVocabulary.js";
import { isLocalAudioPath, type AudioManifest } from "../src/lib/recordings.ts";

type CivicsAudioRow = {
  id: string;
  question: { en: string };
  answer?: { en?: string };
  audio?: { question?: { en?: string }; answer?: { en?: string } };
};
const root = new URL("../", import.meta.url);
const rows: CivicsAudioRow[] = JSON.parse(
  readFileSync(new URL("src/data/civics.json", root), "utf8"),
);
if (!Array.isArray(rows)) throw new Error("civics.json must contain an array");
const manifest: AudioManifest = { words: {}, questions: [] };
let missingFiles = 0;
function available(path: unknown) {
  if (path === undefined) return undefined;
  if (!isLocalAudioPath(path))
    throw new Error("Invalid public audio path: " + String(path));
  if (!existsSync(new URL("public" + path, root))) {
    missingFiles++;
    return undefined;
  }
  return path;
}
const seen = new Set<string>();
for (const row of rows) {
  if (
    typeof row.id !== "string" ||
    typeof row.question?.en !== "string" ||
    !row.question.en.trim()
  )
    throw new Error("Invalid civics audio row");
  if (seen.has(row.question.en))
    throw new Error("Ambiguous duplicate audio question: " + row.id);
  seen.add(row.question.en);
  const questionAudio = available(row.audio?.question?.en);
  const answerAudio = available(row.audio?.answer?.en);
  if (questionAudio || answerAudio)
    manifest.questions.push({
      question: row.question.en,
      questionAudio,
      answer: row.answer?.en,
      answerAudio,
    });
}
for (const word of VOCABULARY_SETS.flatMap((set) => set.words)) {
  const path = "/audio/civics/words/en/" + word.id + ".mp3";
  // A future recording is enabled merely by adding its file and syncing again.
  if (existsSync(new URL("public" + path, root)))
    manifest.words[word.id] = path;
}
const destination = new URL("src/content/audio-manifest.json", root);
const json = JSON.stringify(manifest, null, 2) + "\n";
if (!existsSync(destination) || readFileSync(destination, "utf8") !== json)
  writeFileSync(destination, json);
console.log(
  JSON.stringify(
    {
      manifest: fileURLToPath(destination),
      wordRecordings: Object.keys(manifest.words).length,
      questionRecordings: manifest.questions.filter(
        (entry) => entry.questionAudio,
      ).length,
      answerRecordings: manifest.questions.filter((entry) => entry.answerAudio)
        .length,
      missingReferencedEnglishFiles: missingFiles,
    },
    null,
    2,
  ),
);
