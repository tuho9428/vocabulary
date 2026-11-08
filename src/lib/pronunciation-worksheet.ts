export type VocabularyRow = {
  id: string;
  english: string;
  vietnamese: string;
  pronunciationVi?: string;
};
export const WORKSHEET_COLUMNS = [
  "id",
  "english",
  "vietnameseMeaning",
  "pronunciationVi",
  "finalSound",
] as const;

export function completePronunciationTemplate(
  words: readonly VocabularyRow[],
  existing: Record<string, string>,
): Record<string, string> {
  const ids = new Set(words.map((word) => word.id));
  if (ids.size !== words.length)
    throw new Error("Duplicate vocabulary IDs in source");
  for (const [id, value] of Object.entries(existing)) {
    if (!ids.has(id))
      throw new Error("Unknown existing pronunciation ID: " + id);
    if (typeof value !== "string")
      throw new Error("Pronunciation must be a string: " + id);
  }
  return Object.fromEntries(
    words.map((word) => [
      word.id,
      existing[word.id]?.trim()
        ? existing[word.id]
        : word.pronunciationVi?.trim()
          ? word.pronunciationVi
          : "",
    ]),
  );
}

export function parseCsv(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "",
    quoted = false,
    closed = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += char;
    } else if (char === '"') {
      if (field.length || closed) throw new Error("Unexpected quote in CSV");
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
      closed = false;
    } else if (char === "\r" || char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      closed = false;
      if (char === "\r" && input[i + 1] === "\n") i++;
    } else {
      if (closed) throw new Error("Unexpected text after a quoted CSV field");
      field += char;
    }
  }
  if (quoted) throw new Error("Unclosed quoted CSV field");
  if (field.length || row.length || closed) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function createPronunciationWorksheet(
  words: readonly VocabularyRow[],
  readings: Record<string, string>,
  endings: Record<string, { finalSound: string }>,
): string {
  const quote = (value: string) => '"' + value.replace(/"/g, '""') + '"';
  const rows = [
    Array.from(WORKSHEET_COLUMNS),
    ...words.map((word) => [
      word.id,
      word.english,
      word.vietnamese,
      readings[word.id] ?? "",
      endings[word.id]?.finalSound ?? "",
    ]),
  ];
  // UTF-8 BOM helps Excel recognize Vietnamese text; quoted CRLF CSV follows RFC 4180.
  return (
    "\uFEFF" + rows.map((row) => row.map(quote).join(",")).join("\r\n") + "\r\n"
  );
}

export function planPronunciationImport(
  csv: string,
  words: readonly VocabularyRow[],
  existing: Record<string, string>,
  override = false,
) {
  const next = completePronunciationTemplate(words, existing);
  const rows = parseCsv(csv);
  if (!rows.length) throw new Error("CSV is empty");
  const headers = rows[0].map((value) => value.trim());
  if (new Set(headers).size !== headers.length)
    throw new Error("Duplicate CSV column names");
  const idColumn = headers.indexOf("id"),
    readingColumn = headers.indexOf("pronunciationVi");
  if (idColumn < 0 || readingColumn < 0)
    throw new Error("CSV must contain id and pronunciationVi columns");
  const ids = new Set(words.map((word) => word.id)),
    seen = new Set<string>();
  const conflicts: { id: string; current: string; incoming: string }[] = [],
    unknownIds: string[] = [],
    duplicateIds: string[] = [],
    errors: string[] = [];
  let added = 0,
    unchanged = 0,
    overridden = 0;
  for (const [index, row] of rows.slice(1).entries()) {
    if (row.every((value) => !value.trim())) continue;
    if (row.length !== headers.length) {
      errors.push(
        `Row ${index + 2}: expected ${headers.length} columns, got ${row.length}`,
      );
      continue;
    }
    const id = row[idColumn].trim();
    if (!id) {
      errors.push(`Row ${index + 2}: missing ID`);
      continue;
    }
    if (seen.has(id)) {
      duplicateIds.push(id);
      continue;
    }
    seen.add(id);
    if (!ids.has(id)) {
      unknownIds.push(id);
      continue;
    }
    const incoming = row[readingColumn].trim(),
      current = next[id];
    // Empty cells mean “not approved yet”, never “delete the existing reading”.
    if (!incoming || current === incoming) {
      unchanged++;
      continue;
    }
    if (current.trim()) {
      conflicts.push({ id, current, incoming });
      if (override) {
        next[id] = incoming;
        overridden++;
      }
    } else {
      next[id] = incoming;
      added++;
    }
  }
  const missingIds = words
    .filter((word) => !next[word.id]?.trim())
    .map((word) => word.id);
  const ok =
    !unknownIds.length &&
    !duplicateIds.length &&
    !errors.length &&
    (override || !conflicts.length);
  return {
    ok,
    next,
    summary: {
      added,
      unchanged,
      conflicting: conflicts.length,
      overridden,
      missing: missingIds.length,
      missingRows: words
        .filter((word) => !seen.has(word.id))
        .map((word) => word.id),
      missingIds,
      unknownIds,
      duplicateIds,
      errors,
      conflicts,
    },
  };
}
