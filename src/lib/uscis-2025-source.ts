// Parse the checked-in text extracted from the official M-1778 PDF. This is a
// source-document parser, not a spelling/text crosswalk between test versions.
export const USCIS_2025_URL = "https://www.uscis.gov/sites/default/files/document/questions-and-answers/2025-Civics-Test-128-Questions-and-Answers.pdf";
export const USCIS_UPDATES_URL = "https://www.uscis.gov/citizenship/testupdates";
export const USCIS_2025_SHA256 = "f280608c0fb6dc1eba344b4746a7ba52d02fe411fba30cedd4371819f0abe11c";
// Canonical LF newlines make the checked extraction portable across Git clones.
export const USCIS_2025_TEXT_SHA256 = "07fa5d35a16e8f316838a5e2589f5fbeaf3f30fd2c06d2ea0750206302735ab0";
export type Official2025Question = {
  id: string;
  testVersion: "2025";
  number: number;
  question: string;
  questionVietnamese?: string;
  officialAnswers: string[];
  answers: string[];
  answersVietnamese?: string[];
  requiredAnswers: number;
  special6520: boolean;
  page: number;
  notes?: string[];
  dynamic?: { kind: "state-officeholder" | "current-officeholder" | "state-capital"; reference: string };
};

// These are reviewed question-number annotations, never inferred from spelling.
const dynamic: Record<number, NonNullable<Official2025Question["dynamic"]>["kind"]> = {
  23: "state-officeholder", 29: "state-officeholder", 30: "current-officeholder",
  38: "current-officeholder", 39: "current-officeholder", 57: "current-officeholder",
  61: "state-officeholder", 62: "state-capital",
};
const required: Record<number, number> = { 10: 2, 48: 2, 65: 3, 67: 2, 69: 2, 81: 5, 126: 3 };
export const official2025Id = (number: number) => `uscis-2025-${String(number).padStart(3, "0")}`;

export function parseOfficial2025Text(text: string, translations: Record<number, string> = {}) {
  const rows: Official2025Question[] = [];
  let row: Official2025Question | undefined;
  let page = 1;
  let inAnswers = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/\s+/g, " ");
    const pageHeader = line.match(/^(\d+) of 19$/);
    if (pageHeader) { page = Number(pageHeader[1]); continue; }
    if (!line || line === "\f" || line === "uscis.gov/citizenship" ||
      /^(AMERICAN GOVERNMENT|AMERICAN HISTORY|SYMBOLS AND HOLIDAYS|[ABC]: )/.test(line)) continue;
    const question = line.match(/^(\d+)\.\s+(.+)$/);
    if (question && page >= 2) {
      const number = Number(question[1]);
      row = {
        id: official2025Id(number), testVersion: "2025", number,
        question: question[2].replace(/\s*\*$/, ""),
        ...(translations[number] ? { questionVietnamese: translations[number] } : {}),
        officialAnswers: [], answers: [], requiredAnswers: required[number] ?? 1,
        special6520: question[2].endsWith("*"), page,
        ...(dynamic[number] ? { dynamic: { kind: dynamic[number], reference: USCIS_UPDATES_URL } } : {}),
      };
      rows.push(row); inAnswers = false; continue;
    }
    if (!row) continue;
    if (line.startsWith("•")) {
      row.officialAnswers.push(line.replace(/^•\s*/, "")); inAnswers = true;
    } else if (line.startsWith("For a complete list of tribes,")) {
      row.notes = [line];
    } else if (!inAnswers) {
      row.question += " " + line;
    } else {
      const last = row.officialAnswers.length - 1;
      row.officialAnswers[last] += " " + line;
    }
  }
  for (const item of rows) item.answers = item.dynamic ? [] : [...item.officialAnswers];
  if (rows.length !== 128 || rows.some((item, index) => item.number !== index + 1 || !item.officialAnswers.length))
    throw new Error("Official PDF extraction must contain ordered questions 1–128, each with answer bullets");
  return rows;
}
