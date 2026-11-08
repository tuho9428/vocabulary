import type { StudyItem, TestVersion } from "./types.ts";

export type CivicsQuestion = {
  id: string;
  number?: number;
  question: { en: string; vi?: string };
  answers: string[];
  answersVietnamese: string[];
  sourceVersion: TestVersion | "unspecified";
  source: "src/data/civics.json";
};
export type AnswerValidation = {
  sourceQuestions: number; sourceQuestionsWithAnswers: number;
  importedQuestions: number; importedQuestionsWithAnswers: number;
  missingAnswerIds: string[]; invalidAnswerIds: string[];
  lostAnswerIds: string[]; changedQuestionIds: string[]; errors: string[];
};
const object = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const nonempty = (value: unknown): value is string => typeof value === "string" && !!value.trim();

// Keep complete strings, including semicolon-separated options. Splitting them
// could change an answer that requires several points into supposed alternatives.
export function normalizeAnswers(value: unknown): { en: string[]; vi: string[]; invalid: boolean } {
  if (value == null) return { en: [], vi: [], invalid: false };
  if (typeof value === "string") return { en: nonempty(value) ? [value] : [], vi: [], invalid: !nonempty(value) };
  if (Array.isArray(value)) {
    const parts = value.map(normalizeAnswers);
    return { en: parts.flatMap(part => part.en), vi: parts.flatMap(part => part.vi), invalid: !value.length || parts.some(part => part.invalid) };
  }
  if (object(value)) {
    const language = (raw: unknown) => raw === undefined || raw === null ? {text: [] as string[], invalid:false}
      : typeof raw === "string" ? {text: nonempty(raw) ? [raw] : [], invalid: !nonempty(raw)}
      : Array.isArray(raw) ? {text:raw.filter(nonempty),invalid:!raw.length || !raw.every(nonempty)}
      : {text:[] as string[],invalid:true};
    const en = language(value.en), vi = language(value.vi);
    return {en:en.text,vi:vi.text,invalid:en.invalid || vi.invalid || !("en" in value || "vi" in value)};
  }
  return {en:[],vi:[],invalid:true};
}

export function adaptCivics(raw: unknown) {
  const questions: CivicsQuestion[] = [];
  const errors: string[] = [], invalidAnswerIds: string[] = [];
  if (!Array.isArray(raw)) return {questions,errors:["civics.json must be an array"],invalidAnswerIds};
  const ids = new Set<string>();
  for (const [index, row] of raw.entries()) {
    if (!object(row) || !nonempty(row.id) || !object(row.question) || !nonempty(row.question.en)) {
      errors.push(`Invalid question at index ${index}`); continue;
    }
    if (ids.has(row.id)) {errors.push(`Duplicate question ID: ${row.id}`);continue;}
    ids.add(row.id);
    const answers = normalizeAnswers(row.answer);
    if (answers.invalid) invalidAnswerIds.push(row.id);
    const version = row.testVersion ?? row.version;
    if (version !== undefined && version !== "2008" && version !== "2025") { errors.push(`Invalid test version: ${row.id}`); continue; }
    questions.push({id:row.id,number:typeof row.number === "number" ? row.number : undefined,
      question:{en:row.question.en,vi:nonempty(row.question.vi) ? row.question.vi : undefined},
      answers:answers.en,answersVietnamese:answers.vi,
      sourceVersion:version as TestVersion | undefined ?? "unspecified", source:"src/data/civics.json"});
  }
  return {questions,errors,invalidAnswerIds};
}

// Independent leaf extraction for validation: do not count answers only after
// the same normalizer has already had an opportunity to lose a value.
function sourceAnswers(value: unknown, language: "en" | "vi"): string[] {
  if (Array.isArray(value)) return value.flatMap(entry => sourceAnswers(entry, language));
  if (object(value)) {
    const field = value[language];
    return Array.isArray(field) ? field.filter(nonempty) : nonempty(field) ? [field] : [];
  }
  return language === "en" && nonempty(value) ? [value] : [];
}

export function validateCivicsAnswers(raw: unknown, imported: CivicsQuestion[]): AnswerValidation {
  const rows = Array.isArray(raw) ? raw : [];
  const adapted = adaptCivics(raw);
  const report: AnswerValidation = {sourceQuestions:rows.length,sourceQuestionsWithAnswers:0,
    importedQuestions:imported.length,importedQuestionsWithAnswers:imported.filter(item=>item.answers.length>0).length,
    missingAnswerIds:[],invalidAnswerIds:adapted.invalidAnswerIds,lostAnswerIds:[],changedQuestionIds:[],errors:[...adapted.errors]};
  for (const [index,row] of rows.entries()) {
    if (!object(row)) continue;
    const id = typeof row.id === "string" ? row.id : `index:${index}`;
    const en = sourceAnswers(row.answer,"en"), vi = sourceAnswers(row.answer,"vi");
    if (en.length) report.sourceQuestionsWithAnswers++; else report.missingAnswerIds.push(id);
    const target = imported.find(item=>item.id===id);
    if (!target || JSON.stringify(target.answers)!==JSON.stringify(en) || JSON.stringify(target.answersVietnamese)!==JSON.stringify(vi)) report.lostAnswerIds.push(id);
    if (target && object(row.question) && (target.question.en!==row.question.en || target.question.vi!==(nonempty(row.question.vi)?row.question.vi:undefined))) report.changedQuestionIds.push(id);
  }
  if (report.sourceQuestions!==report.importedQuestions) report.errors.push("Question count changed during import");
  if (new Set(imported.map(item=>item.id)).size!==imported.length) report.errors.push("Duplicate imported question IDs");
  return report;
}

export function answerValidationFailed(report: AnswerValidation) {
  return !!(report.errors.length || report.invalidAnswerIds.length || report.lostAnswerIds.length || report.changedQuestionIds.length);
}

const questionKey = (text: string) => text.trim().replace(/\s+/g," ");
export function attachCivicsAnswers(item: StudyItem, questions: CivicsQuestion[]): StudyItem {
  if (item.answer?.trim()) return {...item,answers:item.answers ?? [item.answer],answerStatus:"available"};
  if (!item.question) return {...item,answerStatus:"unmatched"};
  const matches=questions.filter(row=>questionKey(row.question.en)===questionKey(item.question!) && (row.sourceVersion===item.sourceVersion || row.sourceVersion==="unspecified"));
  const exactVersion=matches.filter(row=>row.sourceVersion===item.sourceVersion);
  const candidates=exactVersion.length ? exactVersion : matches;
  if (candidates.length>1) throw new Error(`Ambiguous civics question match: ${item.id}`);
  const match=candidates[0];
  if (!match) return {...item,answerStatus:"unmatched"};
  return {...item,answer:match.answers[0],answers:[...match.answers],answersVietnamese:[...match.answersVietnamese],
    answerSourceId:match.id,answerSourceVersion:match.sourceVersion,answerStatus:match.answers.length?"available":"missing"};
}
