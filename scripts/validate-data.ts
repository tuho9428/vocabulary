import type { SourceSet } from "../src/lib/content-adapter.ts";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  allItems,
  civicsAnswerReport,
  contentReport,
  official2025Questions,
} from "../src/lib/content.ts";
import {
  answerValidationFailed,
} from "../src/lib/civics-adapter.ts";
import { officialQuestions } from "../src/data/civics2025Examples.js";
import { questionTranslations } from "../src/data/civics2025Examples.js";
import { parseOfficial2025Text, USCIS_2025_SHA256, USCIS_2025_TEXT_SHA256 } from "../src/lib/uscis-2025-source.ts";
import { validateOfficial2025 } from "../src/lib/uscis-2025.ts";
import { VOCABULARY_SETS } from "../src/data/civicsVocabulary.js";
import {
  completePronunciationTemplate,
  parseCsv,
  WORKSHEET_COLUMNS,
} from "../src/lib/pronunciation-worksheet.ts";

const vocabulary = (VOCABULARY_SETS as SourceSet[]).flatMap((set) => set.words);
const officialText = readFileSync(new URL("../src/content/sources/uscis-2025.txt", import.meta.url), "utf8");
if (createHash("sha256").update(officialText.replace(/\r\n/g, "\n")).digest("hex") !== USCIS_2025_TEXT_SHA256) throw new Error("Official PDF extraction fingerprint changed");
const officialSource = parseOfficial2025Text(officialText, questionTranslations);
const official2025 = validateOfficial2025(official2025Questions, officialSource, allItems);
const pdfHash = createHash("sha256").update(readFileSync(new URL("../src/content/sources/uscis-2025.pdf", import.meta.url))).digest("hex");
if (pdfHash !== USCIS_2025_SHA256) throw new Error("Official source PDF fingerprint changed");
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
      vocabularyExampleQuestions: contentReport.questions,
      civicsAnswers: civicsAnswerReport,
      official2025,
      vocabularyExamplesWithAnswers: allItems.filter(
        (item) => item.answers?.length,
      ).length,
      unmapped2025QuestionIds: Object.keys(officialQuestions)
        .filter(
          (id) =>
            !official2025Questions.some(
              (row) =>
                row.number === Number(id) && row.testVersion === "2025",
            ),
        )
        .map(Number),
      sourceVersionMetadata:
        "2025 answers resolve only by official versioned IDs; unversioned civics.json remains separate",
      missingInVocabularyExamples: {
        missingStaticAnswers: allItems.filter(item => !item.dynamicAnswer && !item.answers?.length).map(item => item.id),
        unresolvedDynamicExamples: allItems.filter(item => item.dynamicAnswer).map(item => item.id),
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
  !official2025.valid ||
  missingTemplateIds.length ||
  worksheetErrors.length
)
  process.exitCode = 1;
