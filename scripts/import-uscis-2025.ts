import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { parseOfficial2025Text, USCIS_2025_SHA256, USCIS_2025_TEXT_SHA256, USCIS_2025_URL } from "../src/lib/uscis-2025-source.ts";
import { questionTranslations } from "../src/data/civics2025Examples.js";

const source = new URL("../src/content/sources/uscis-2025.pdf", import.meta.url);
const hash = createHash("sha256").update(readFileSync(source)).digest("hex");
if (hash !== USCIS_2025_SHA256) throw new Error("USCIS PDF changed: review its contents and provenance before importing");
const text = readFileSync(new URL("../src/content/sources/uscis-2025.txt", import.meta.url), "utf8");
if (createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex") !== USCIS_2025_TEXT_SHA256)
  throw new Error("Official PDF text extraction changed: review before importing");
const questions = parseOfficial2025Text(text, questionTranslations);
const result = { testVersion: "2025", revision: "M-1778 (09/25)", source: USCIS_2025_URL, pdfSha256: hash, questions };
const destination = new URL("../src/content/civics-2025.json", import.meta.url);
const json = JSON.stringify(result, null, 2) + "\n";
if (process.argv.includes("--check")) {
  if (readFileSync(destination, "utf8").replace(/\r\n/g, "\n") !== json) throw new Error("Bundled 2025 bank differs from its official source extraction");
} else writeFileSync(destination, json);
console.log(JSON.stringify({ questions: questions.length, static: questions.filter(q => !q.dynamic).length, dynamic: questions.filter(q => q.dynamic).map(q => q.id), checked: process.argv.includes("--check") }));
