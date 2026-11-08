import "./helpers/register-tsx.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { official2025Questions, allItems, getBank } from "../src/lib/content.ts";
import { parseOfficial2025Text, official2025Id, USCIS_2025_SHA256, USCIS_2025_TEXT_SHA256, USCIS_2025_URL } from "../src/lib/uscis-2025-source.ts";
import { attachOfficial2025, hasUsableCivicsAnswer, validateOfficial2025 } from "../src/lib/uscis-2025.ts";
import { questionTranslations } from "../src/data/civics2025Examples.js";
import { initialState, startSession, finishPractice } from "../src/lib/engine.ts";
import { loadProgress, saveProgress, STORAGE_KEY } from "../src/lib/storage.ts";
import type { StudyItem } from "../src/lib/types.ts";

const { CivicsQuestionCard } = await import("../src/components/civics-question-card.tsx");
const { Settings } = await import("../src/components/family-settings.tsx");
const rawText = readFileSync(new URL("../src/content/sources/uscis-2025.txt", import.meta.url), "utf8");
const source = parseOfficial2025Text(rawText, questionTranslations);
const itemFor = (n: number) => allItems.find(item => item.questionId === n)!;
const rowFor = (n: number) => official2025Questions[n - 1];
function render(item: StudyItem, revealed = true, mode: "learning" | "practice" = "learning") {
  return renderToStaticMarkup(createElement(CivicsQuestionCard, {
    item, revealed, mode, heading: createRef<HTMLHeadingElement>(),
    onPlay() {}, onReveal() {}, onContinue() {},
  }));
}

test("official PDF snapshot yields all 128 questions and preserves every answer bullet and existing translation", () => {
  const hash = createHash("sha256").update(readFileSync(new URL("../src/content/sources/uscis-2025.pdf", import.meta.url))).digest("hex");
  assert.equal(hash, USCIS_2025_SHA256);
  assert.equal(createHash("sha256").update(rawText.replace(/\r\n/g, "\n")).digest("hex"), USCIS_2025_TEXT_SHA256);
  assert.deepEqual(official2025Questions, source);
  assert.equal(source.length, 128);
  assert.equal(new Set(source.map(q => q.id)).size, 128);
  assert.equal(source.flatMap(q => q.officialAnswers).length, (rawText.match(/^•/gm) ?? []).length);
  source.forEach((q, index) => {
    assert.equal(q.id, official2025Id(index + 1));
    assert.equal(q.testVersion, "2025");
    assert.equal(q.questionVietnamese, (questionTranslations as Record<number, string>)[q.number]);
    assert.ok(q.officialAnswers.every(answer => answer.trim() && !/^\d+ of 19$|^uscis.gov\/citizenship$|For a complete list/.test(answer)));
    assert.deepEqual(q.answers, q.dynamic ? [] : q.officialAnswers);
  });
});

test("2025 questions 1, 17, and 21 resolve to their complete official accepted answers", () => {
  assert.deepEqual(rowFor(1).answers, ["Republic", "Constitution-based federal republic", "Representative democracy"]);
  assert.deepEqual(rowFor(17).answers, ["Executive branch"]);
  assert.deepEqual(rowFor(21).answers, ["One hundred (100)"]);
  for (const number of [1, 17, 21]) {
    assert.deepEqual(itemFor(number).answers, rowFor(number).answers);
    assert.match(render(itemFor(number)), new RegExp(number === 17 ? "Executive branch" : number === 21 ? "One hundred \\(100\\)" : "Republic"));
  }
});

test("all 128 records are valid: 120 static answers and eight explicit unresolved dynamic requirements", () => {
  const report = validateOfficial2025(official2025Questions, source, allItems);
  assert.equal(report.valid, true);
  assert.equal(report.questionsWithValidAnswerData, 128);
  assert.equal(report.staticQuestionsWithAnswers, 120);
  assert.deepEqual(report.dynamicAnswerIds, [23,29,30,38,39,57,61,62].map(official2025Id));
  assert.deepEqual(report.missingAnswers, []);
  assert.deepEqual(report.invalidMappings, []);
  for (const q of source.filter(q => q.dynamic)) {
    assert.deepEqual(q.answers, []);
    assert.ok(q.officialAnswers.length);
    assert.ok(q.dynamic!.reference.startsWith("https://www.uscis.gov/"));
  }
});

test("mapping uses the versioned stable ID and official number, never English text similarity", () => {
  const original = { ...itemFor(1), question: "Deliberately unrelated text", answer: "Wrong", answers: ["Wrong"] };
  const result = attachOfficial2025(original, official2025Questions);
  assert.equal(result.answerSourceId, "uscis-2025-001");
  assert.equal(result.question, rowFor(1).question);
  assert.deepEqual(result.answers, rowFor(1).answers);
  const old = { ...original, sourceVersion: "2008" as const };
  assert.deepEqual(attachOfficial2025(old, official2025Questions), old);
  assert.deepEqual(getBank("2008"), []);
});

test("validation fails if static answers, questions, IDs, alternatives, or active mappings are damaged", () => {
  for (const damage of ["empty", "alternative", "duplicate", "removed", "dynamic", "question", "version", "missing-field", "invalid-answer"] as const) {
    const rows = structuredClone(official2025Questions);
    if (damage === "empty") rows[0].answers = [];
    if (damage === "alternative") rows[0].answers.pop();
    if (damage === "duplicate") rows[1].id = rows[0].id;
    if (damage === "removed") rows.pop();
    if (damage === "dynamic") delete rows[22].dynamic;
    if (damage === "question") rows[0].question = "Changed";
    if (damage === "version") rows[0].testVersion = "2008" as "2025";
    if (damage === "missing-field") Reflect.deleteProperty(rows[0], "answers");
    if (damage === "invalid-answer") rows[0].answers = [42 as unknown as string];
    assert.equal(validateOfficial2025(rows, source, allItems).valid, false, damage);
  }
  const items = structuredClone(allItems);
  items[0].answers = [];
  const report = validateOfficial2025(official2025Questions, source, items);
  assert.equal(report.valid, false);
  assert.ok(report.invalidMappings.includes(items[0].id));
});

test("recommended answers are concise, while other accepted alternatives remain available inline", () => {
  const before = render(itemFor(1), false);
  assert.doesNotMatch(before, /Republic|Representative democracy/);
  const after = render(itemFor(1));
  assert.match(after, /<h2 lang="en">Republic<\/h2>/);
  assert.match(after, /<details class="accepted-answers"><summary>Các đáp án khác<\/summary>/);
  assert.match(after, /Constitution-based federal republic/);
  assert.match(after, /Representative democracy/);
  assert.match(after, /ĐÁP ÁN/);
  assert.match(after, /Tiếp tục/);
  assert.doesNotMatch(after, /Thông tin nguồn|uscis.gov|href=|uscis-2025/);
  for (const number of [10,48,65,67,69,81,126]) {
    const q = rowFor(number);
    const item = attachOfficial2025({ ...itemFor(1), questionId: number }, official2025Questions);
    assert.equal((render(item).match(/<h2 /g) ?? []).length, q.requiredAnswers);
  }
});

test("practice reveal automatically shows the Vietnamese question and English answer without needing an answer translation", () => {
  const item = { ...itemFor(17), answersVietnamese: [] };
  const before = render(item, false, "practice");
  assert.match(before, /Xem tiếng Việt/);
  assert.doesNotMatch(before, /Executive branch/);
  const after = render(item, true, "practice");
  assert.match(after, /Executive branch/);
  assert.match(after, /class="question-translation" lang="vi"/);
  assert.doesNotMatch(after, /Xem tiếng Việt|Chưa có đáp án/);
});

test("new sessions omit dynamic and missing civics questions without dropping vocabulary words", () => {
  const dynamic = itemFor(30);
  const missing = { ...itemFor(17), answer: undefined, answers: [], answerStatus: "missing" as const };
  const available = itemFor(1);
  assert.equal(hasUsableCivicsAnswer(dynamic), false);
  assert.equal(hasUsableCivicsAnswer(missing), false);
  const state = startSession(initialState(), [dynamic, missing, available], "2026-11-08", "daily");
  assert.equal(state.session!.queue.length, 3);
  assert.deepEqual(state.session!.practiceIds, [available.id]);
});

test("runtime missing-answer skip advances without changing progress, assignments, or review history", () => {
  const missing = { ...itemFor(1), answer: undefined, answers: [], answerStatus: "missing" as const };
  const html = render(missing);
  assert.match(html, /Chưa có đáp án cho câu này\./);
  assert.match(html, /Bỏ qua/);
  assert.doesNotMatch(html, /USCIS|href=|ĐÁP ÁN|Tiếp tục/);
  const state = initialState();
  state.session = { date: "2026-11-08", version: "2025", mode: "daily", queue: [], cursor: 0, failedIds: [], practiceIds: [missing.id], practiceIndex: 0, phase: "practice" };
  const before = structuredClone(state);
  const skipped = finishPractice(state);
  assert.deepEqual(skipped.progress, before.progress);
  assert.deepEqual(skipped.assignments, before.assignments);
  assert.deepEqual(skipped.reviewHistory, before.reviewHistory);
  assert.equal(skipped.session!.phase, "complete");
});

test("saved progress and unfinished question IDs survive the official-bank upgrade unchanged", () => {
  const item = itemFor(1);
  const state = initialState();
  state.progress[item.id] = { learnedOn:"2026-11-01", nextReview:"2026-11-10", intervalIndex:2, remembered:3, forgotten:1, lastReviewed:"2026-11-07" };
  state.session = { date:"2026-11-08", version:"2025", mode:"daily", queue:[{id:item.id,kind:"new"}], cursor:1, failedIds:[], practiceIds:[item.id], practiceIndex:0, phase:"practice" };
  const values = new Map<string,string>();
  const storage = { getItem:(key:string)=>values.get(key)??null, setItem:(key:string,value:string)=>{values.set(key,value);} };
  assert.equal(saveProgress(storage,state),true);
  const raw = storage.getItem(STORAGE_KEY);
  const loaded = loadProgress(storage,allItems);
  assert.equal(loaded.notice,""); assert.deepEqual(loaded.state,state);
  assert.match(render(item),/Republic/);
  assert.equal(storage.getItem(STORAGE_KEY),raw);
});

test("USCIS attribution and unresolved dynamic questions are available only outside the lesson in settings", () => {
  const html = renderToStaticMarkup(createElement(Settings, { state:initialState(), unfinished:false, heading:createRef<HTMLHeadingElement>(), onBack(){}, onSave(){} }));
  assert.ok(html.includes(USCIS_2025_URL));
  assert.match(html,/128 câu hỏi|128 câu/);
  assert.match(html,/Kiểm tra đáp án hiện tại/);
  assert.match(html,/Câu 23/);
  assert.doesNotMatch(render(itemFor(1)),/Thông tin nguồn|href=/);
});
