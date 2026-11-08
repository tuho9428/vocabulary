import type { SourceSet } from "../src/lib/content-adapter.ts";
import {
  readFileSync,
  writeFileSync,
  renameSync,
  existsSync,
  unlinkSync,
} from "node:fs";
import { resolve } from "node:path";
import { VOCABULARY_SETS } from "../src/data/civicsVocabulary.js";
import { planPronunciationImport } from "../src/lib/pronunciation-worksheet.ts";

const args = process.argv.slice(2);
let input: string | undefined;
let override = false,
  dryRun = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--override") override = true;
  else if (args[i] === "--dry-run") dryRun = true;
  else if (
    args[i] === "--input" &&
    args[i + 1] &&
    !args[i + 1].startsWith("--")
  )
    input = args[++i];
  else
    throw new Error(
      "Usage: npm run import:pronunciation -- [--input path.csv] [--dry-run] [--override]",
    );
}
const target = new URL("../src/content/pronunciation-vi.json", import.meta.url);
const inputPath = input
  ? resolve(input)
  : new URL("../src/content/pronunciation-worksheet.csv", import.meta.url);
try {
  const original = readFileSync(target, "utf8");
  const csv = new TextDecoder("utf-8", { fatal: true }).decode(
    readFileSync(inputPath),
  );
  const result = planPronunciationImport(
    csv,
    (VOCABULARY_SETS as SourceSet[]).flatMap((set) => set.words),
    JSON.parse(original),
    override,
  );
  let applied = false;
  if (!result.ok) {
    process.exitCode = 1;
  } else if (!dryRun) {
    if (readFileSync(target, "utf8") !== original)
      throw new Error(
        "Pronunciation JSON changed during import; retry after reviewing it",
      );
    const temporary = new URL(
      `pronunciation-vi.json.${process.pid}.tmp`,
      target,
    );
    let created = false;
    try {
      writeFileSync(temporary, JSON.stringify(result.next, null, 2) + "\n", {
        encoding: "utf8",
        flag: "wx",
      });
      created = true;
      renameSync(temporary, target);
      applied = true;
    } finally {
      if (created && existsSync(temporary)) unlinkSync(temporary);
    }
  }
  console.log(
    JSON.stringify(
      {
        ...result.summary,
        missingIds: undefined,
        missingRows: result.summary.missingRows.length,
        dryRun,
        applied,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
