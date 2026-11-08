import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { contentReport } from "../src/lib/content.ts";

const sourceFiles = [
  "civicsVocabulary.js",
  "civics2025Examples.js",
  "civicsVocabulary.test.js",
];
console.log(
  JSON.stringify(
    {
      sets: contentReport.sets,
      words: contentReport.words,
      questions: contentReport.questions,
      missing: {
        answers: contentReport.missingAnswers.length,
        audio: contentReport.missingAudio.length,
        pronunciation: contentReport.missingPronunciation.length,
      },
      availableVersions: ["2025"],
      unavailableVersions: ["2008"],
      errors: contentReport.errors,
      sourceHashes: Object.fromEntries(
        sourceFiles.map((file) => [
          file,
          createHash("sha256")
            .update(
              readFileSync(new URL(`../src/data/${file}`, import.meta.url)),
            )
            .digest("hex"),
        ]),
      ),
    },
    null,
    2,
  ),
);
if (contentReport.errors.length) process.exitCode = 1;
