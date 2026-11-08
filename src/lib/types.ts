export type TestVersion = "2008" | "2025";
export type StudyItem = {
  id: string;
  english: string;
  vietnamese: string;
  pronunciation?: string;
  pronunciationVi?: string;
  finalSound?: string;
  audio?: string;
  questionAudio?: string;
  answerAudio?: string;
  category?: string;
  level?: number;
  questionIds?: number[];
  questionId?: number;
  question?: string;
  questionVietnamese?: string;
  answer?: string;
  answers?: string[];
  answersVietnamese?: string[];
  answerSourceId?: string;
  answerSourceVersion?: TestVersion | "unspecified";
  answerStatus?: "available" | "missing" | "unmatched";
  explanation?: string;
  source: string;
  sourceVersion: TestVersion;
  sourceRevision?: string;
  status: "imported" | "sample";
};
export type Preferences = {
  testVersion: TestVersion;
  language: "vi" | "bilingual";
  newWordsPerDay: 1 | 2 | 3;
  speechRate: number;
};
export type WordProgress = {
  learnedOn: string;
  intervalIndex: number;
  nextReview: string;
  remembered: number;
  forgotten: number;
  lastReviewed: string;
};
export type SessionMode = "daily" | "extra" | "review";
export type QueueEntry = {
  id: string;
  kind: "review" | "new" | "retry" | "practice";
};
export type StudySession = {
  date: string;
  version: TestVersion;
  mode: SessionMode;
  queue: QueueEntry[];
  cursor: number;
  failedIds: string[];
  practiceIds: string[];
  practiceIndex: number;
  phase: "study" | "practice" | "complete";
};
export type ReviewAttempt = {
  id: string;
  date: string;
  remembered: boolean;
  kind: QueueEntry["kind"];
  mode: SessionMode;
  scheduled: boolean;
};
export type AppState = {
  schemaVersion: 2;
  preferences: Preferences;
  progress: Record<string, WordProgress>;
  archivedProgress: Record<string, WordProgress>;
  assignments: Record<string, string[]>;
  reviewHistory: ReviewAttempt[];
  lastStudiedDate: string | null;
  session: StudySession | null;
  // Voluntary review can temporarily pause an unfinished vocabulary lesson.
  pausedSession: StudySession | null;
};
