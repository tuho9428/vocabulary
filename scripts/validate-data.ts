import type { SourceSet } from "../src/lib/content-adapter.ts";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  allItems,
  civicsQuestions,
  civicsAnswerReport,
  contentReport,
} from "../src/lib/content.ts";
import {
  answerValidationFailed,
  validateCivicsAnswerAttachments,
} from "../src/lib/civics-adapter.ts";
import { officialQuestions } from "../src/data/civics2025Examples.js";
import { VOCABULARY_SETS } from "../src/data/civicsVocabulary.js";
import {
  completePronunciationTemplate,
  parseCsv,
  WORKSHEET_COLUMNS,
} from "../src/lib/pronunciation-worksheet.ts";

const vocabulary = (VOCABULARY_SETS as SourceSet[]).flatMap((set) => set.words);
const civicsAttachments = validateCivicsAnswerAttachments(allItems, civicsQuestions);
const readings: Record<string, string> = JSON.parse(
  readFileSync(
    new URL("../src/content/pronunciation-vi.json", import.meta.url),
    "utf8",
  ),
);
completePronunciationTemplate(vocabulary, readings); // Reject unknown IDs and non-string values.
const missingTemplateIds = vocabulary
  .filter((word) => !Object.hasOwn(readings, word.id))
  .map((word) => word.id);
const sheet = parseCsv(
  readFileSync(
    new URL("../src/content/pronunciation-worksheet.csv", import.meta.url),
    "utf8",
  ),
);
const worksheetErrors: string[] = [];
if (JSON.stringify(sheet[0]) !== JSON.stringify(WORKSHEET_COLUMNS))
  worksheetErrors.push("Worksheet columns do not match");
if (sheet.length !== vocabulary.length + 1)
  worksheetErrors.push("Worksheet row count does not match vocabulary");
vocabulary.forEach((word, index) => {
  const row = sheet[index + 1];
  if (
    !row ||
    row[0] !== word.id ||
    row[1] !== word.english ||
    row[2] !== word.vietnamese
  )
    worksheetErrors.push("Worksheet source mismatch: " + word.id);
});

const sourceFiles = [
  "civicsVocabulary.js",
  "civics2025Examples.js",
  "civicsVocabulary.test.js",
  "civics.json",
];
console.log(
  JSON.stringify(
    {
      sets: contentReport.sets,
      words: contentReport.words,
      pronunciationTemplate: {
        entries: Object.keys(readings).length,
        approved: Object.values(readings).filter((value) => value.trim())
          .length,
        empty: Object.values(readings).filter((value) => !value.trim()).length,
        missingTemplateIds,
        worksheetRows: sheet.length - 1,
        worksheetErrors,
      },
      questions: contentReport.questions,
      civicsAnswers: civicsAnswerReport,
      civicsAttachments,
      vocabularyExamplesWithAnswers: allItems.filter(
        (item) => item.answers?.length,
      ).length,
      unmatched2025QuestionIds: Object.entries(officialQuestions)
        .filter(
          ([, question]) =>
            !civicsQuestions.some(
              (row) =>
                row.question.en === question &&
                (row.sourceVersion === "2025" ||
                  row.sourceVersion === "unspecified"),
            ),
        )
        .map(([id]) => Number(id)),
      sourceVersionMetadata:
        "civics.json does not declare a test version; original IDs and unspecified provenance are retained",
      missingInVocabularyExamples: {
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
if (
  contentReport.errors.length ||
  answerValidationFailed(civicsAnswerReport) ||
  civicsAttachments.lostAnswerVocabularyIds.length ||
  missingTemplateIds.length ||
  worksheetErrors.length
)
  process.exitCode = 1;
