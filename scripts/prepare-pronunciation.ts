import type { SourceSet } from "../src/lib/content-adapter.ts";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { VOCABULARY_SETS } from "../src/data/civicsVocabulary.js";
import {
  completePronunciationTemplate,
  createPronunciationWorksheet,
} from "../src/lib/pronunciation-worksheet.ts";

const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--refresh-worksheet"))
  throw new Error(
    "Usage: npm run prepare:pronunciation -- [--refresh-worksheet]",
  );
const words = (VOCABULARY_SETS as SourceSet[]).flatMap((set) => set.words);
const root = new URL("../src/content/", import.meta.url);
const templatePath = new URL("pronunciation-vi.json", root),
  worksheetPath = new URL("pronunciation-worksheet.csv", root);
const existing = JSON.parse(readFileSync(templatePath, "utf8"));
const complete = completePronunciationTemplate(words, existing);
const endings = JSON.parse(
  readFileSync(new URL("final-sounds.json", root), "utf8"),
);
writeFileSync(templatePath, JSON.stringify(complete, null, 2) + "\n", "utf8");
const refresh =
  !existsSync(worksheetPath) || args.includes("--refresh-worksheet");
if (refresh)
  writeFileSync(
    worksheetPath,
    createPronunciationWorksheet(words, complete, endings),
    "utf8",
  );
console.log(
  JSON.stringify(
    {
      entries: words.length,
      approved: Object.values(complete).filter((value) => value.trim()).length,
      missing: Object.values(complete).filter((value) => !value.trim()).length,
      worksheet: refresh
        ? "written"
        : "preserved (use --refresh-worksheet only after importing manual edits)",
    },
    null,
    2,
  ),
);
