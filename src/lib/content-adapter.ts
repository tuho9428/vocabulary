import type { StudyItem } from "./types.ts";

export type SourceWord = {
  id: string;
  english: string;
  vietnamese: string;
  pronunciation?: string;
  pronunciationVi?: string;
  finalSound?: string;
  audio?: string;
  category: string;
  level: number;
  questionIds: number[];
  example: {
    questionId: number;
    english?: string;
    vietnamese?: string;
    answer?: string;
  };
};
export type SourceSet = {
  id: string;
  name: string;
  vietnameseName: string;
  words: SourceWord[];
};
export type ContentReport = {
  sets: number;
  words: number;
  questions: number;
  missingAnswers: string[];
  missingAudio: string[];
  missingPronunciation: string[];
  errors: string[];
};

export function adaptVocabulary(
  sets: SourceSet[],
  questions: Record<number, string>,
  translations: Record<number, string>,
  source: string,
) {
  const report: ContentReport = {
    sets: sets.length,
    words: 0,
    questions: Object.keys(questions).length,
    missingAnswers: [],
    missingAudio: [],
    missingPronunciation: [],
    errors: [],
  };
  const items: StudyItem[] = [];
  const ids = new Set<string>();
  const englishWords = new Set<string>();
  for (const set of sets)
    for (const word of set.words) {
      const normalized = word.english?.trim().toLowerCase();
      if (!word.id || !normalized || !word.vietnamese?.trim()) {
        report.errors.push(
          "Missing required vocabulary field: " + (word.id || set.id),
        );
        continue;
      }
      if (ids.has(word.id) || englishWords.has(normalized)) {
        report.errors.push("Duplicate vocabulary: " + word.id);
        continue;
      }
      ids.add(word.id);
      englishWords.add(normalized);
      if (word.category !== set.id)
        report.errors.push("Category mismatch: " + word.id);
      const example = word.example;
      const questionIds = Array.isArray(word.questionIds)
        ? word.questionIds
        : [];
      if (!questionIds.length)
        report.errors.push("Missing question references: " + word.id);
      if (!example || !questionIds.includes(example.questionId))
        report.errors.push("Invalid example reference: " + word.id);
      for (const id of questionIds) {
        if (!Number.isInteger(id) || !questions[id] || !translations[id])
          report.errors.push(
            "Missing question/translation " + id + ": " + word.id,
          );
      }
      if (
        example &&
        (example.english !== questions[example.questionId] ||
          example.vietnamese !== translations[example.questionId])
      )
        report.errors.push("Example mismatch: " + word.id);
      if (!example?.answer) report.missingAnswers.push(word.id);
      if (!word.audio) report.missingAudio.push(word.id);
      if (!word.pronunciation) report.missingPronunciation.push(word.id);
      items.push({
        id: word.id,
        english: word.english,
        vietnamese: word.vietnamese,
        pronunciation: word.pronunciation,
        pronunciationVi: word.pronunciationVi?.trim() || undefined,
        finalSound: word.finalSound?.trim() || undefined,
        audio: word.audio,
        category: word.category,
        level: word.level,
        questionIds: [...questionIds],
        questionId: example?.questionId,
        question: example?.english,
        questionVietnamese: example?.vietnamese,
        answer: example?.answer,
        source,
        sourceVersion: "2025",
        sourceRevision: "M-1778, 09/25",
        status: "imported",
      });
    }
  report.words = items.length;
  return { items, report };
}
