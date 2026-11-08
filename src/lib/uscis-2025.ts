import type { StudyItem } from "./types.ts";
import { official2025Id, type Official2025Question } from "./uscis-2025-source.ts";

export function attachOfficial2025(item: StudyItem, questions: Official2025Question[]): StudyItem {
  if (item.sourceVersion !== "2025" || item.questionId == null) return item;
  const row = questions.find(q => q.id === official2025Id(item.questionId!) && q.testVersion === item.sourceVersion && q.number === item.questionId);
  return {
    ...item,
    question: row?.question ?? item.question,
    // Existing Vietnamese study translations take precedence and are never rewritten.
    questionVietnamese: item.questionVietnamese ?? row?.questionVietnamese,
    answer: row?.answers[0], answers: row ? [...row.answers] : [],
    answersVietnamese: row?.answersVietnamese ? [...row.answersVietnamese] : [],
    answerSourceId: row?.id, answerSourceVersion: "2025",
    answerStatus: row?.dynamic ? "dynamic" : row?.answers.length ? "available" : "missing",
    dynamicAnswer: row?.dynamic,
    requiredAnswers: row?.requiredAnswers,
  };
}

export function hasUsableCivicsAnswer(item: StudyItem) {
  return !item.dynamicAnswer && item.answerStatus !== "dynamic" &&
    !!(item.answers?.some(answer => typeof answer === "string" && answer.trim()) ||
      (typeof item.answer === "string" && item.answer.trim()));
}

export function validateOfficial2025(questions: Official2025Question[], source: Official2025Question[], items: StudyItem[]) {
  const text = (value: unknown): value is string => typeof value === "string" && !!value.trim();
  const answerList = (value: unknown): value is string[] => Array.isArray(value) && value.length > 0 && value.every(text);
  const duplicateQuestionIds = questions.filter((q, i) => questions.findIndex(row => row.id === q.id) !== i).map(q => q.id);
  const missingAnswers = questions.filter(q => !q.dynamic && !answerList(q.answers)).map(q => q.id);
  const invalidQuestionIds = questions.filter(q =>
    q.testVersion !== "2025" || q.id !== official2025Id(q.number) ||
    !Number.isInteger(q.number) || q.number < 1 || q.number > 128 ||
    !text(q.question) || !answerList(q.officialAnswers) ||
    !Number.isInteger(q.requiredAnswers) || q.requiredAnswers < 1 ||
    (!q.dynamic && (!answerList(q.answers) || q.answers.length < q.requiredAnswers)) ||
    (q.dynamic && (!Array.isArray(q.answers) || q.answers.length !== 0 ||
      !["state-officeholder", "current-officeholder", "state-capital"].includes(q.dynamic.kind) ||
      !text(q.dynamic.reference)))
  ).map(q => q.id);
  const changedSourceIds = source.filter(expected => JSON.stringify(questions.find(q => q.id === expected.id)) !== JSON.stringify(expected)).map(q => q.id);
  const invalidMappings = items.filter(item => {
    if (item.sourceVersion !== "2025" || item.questionId == null) return false;
    const row = questions.find(q => q.id === official2025Id(item.questionId!) && q.number === item.questionId && q.testVersion === "2025");
    return !row || item.question !== row.question || item.answerSourceId !== row.id || item.answerSourceVersion !== "2025" || item.answer !== row.answers?.[0] ||
      JSON.stringify(item.answers) !== JSON.stringify(row.answers) ||
      JSON.stringify(item.answersVietnamese ?? []) !== JSON.stringify(row.answersVietnamese ?? []) ||
      JSON.stringify(item.dynamicAnswer) !== JSON.stringify(row.dynamic) ||
      item.requiredAnswers !== row.requiredAnswers ||
      item.answerStatus !== (row.dynamic ? "dynamic" : "available");
  }).map(item => item.id);
  const report = {
    totalQuestions: questions.length,
    questionsWithValidAnswerData: questions.filter(q => !invalidQuestionIds.includes(q.id) && !missingAnswers.includes(q.id) && !changedSourceIds.includes(q.id)).length,
    staticQuestionsWithAnswers: questions.filter(q => !q.dynamic && answerList(q.answers)).length,
    dynamicAnswerIds: questions.filter(q => q.dynamic).map(q => q.id),
    missingAnswers, duplicateQuestionIds, invalidQuestionIds, changedSourceIds, invalidMappings,
  };
  return { ...report, valid: questions.length === 128 && source.length === 128 && ![missingAnswers, duplicateQuestionIds, invalidQuestionIds, changedSourceIds, invalidMappings].some(ids => ids.length) };
}
