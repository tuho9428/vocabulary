import "./helpers/register-tsx.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { createRef, type ReactElement } from "react";
import { allItems, official2025Questions } from "../src/lib/content.ts";
import { attachOfficial2025 } from "../src/lib/uscis-2025.ts";
import { createAudioPlayer } from "../src/lib/audio-player.ts";
const { CivicsQuestionCard } = await import("../src/components/civics-question-card.tsx");

type Node = ReactElement<{ children?: unknown; onClick?: () => void; 'aria-label'?: string }>;
function buttons(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(buttons);
  if (!value || typeof value !== "object" || !("type" in value)) return [];
  const node = value as Node;
  if (typeof node.type === "function") return buttons((node.type as (props: unknown) => unknown)(node.props));
  return [...(node.type === "button" ? [node] : []), ...buttons(node.props.children)];
}
function label(value: unknown): string {
  if (Array.isArray(value)) return value.map(label).join("");
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "props" in value) return label((value as Node).props.children);
  return "";
}
test("every official static answer control speaks its exact English text only after reveal", () => {
  for (const row of official2025Questions.filter(q => !q.dynamic)) {
    const item = attachOfficial2025({ ...allItems[0], questionId: row.number, questionVietnamese: "Tiếng Việt", answersVietnamese: [] }, official2025Questions);
    const calls: string[] = [];
    const props = { item, heading: createRef<HTMLHeadingElement>(), onPlay: (text: string) => { calls.push(text); }, onReveal() {}, onContinue() {} };
    const hidden = buttons(CivicsQuestionCard({ ...props, revealed: false }));
    assert.equal(hidden.filter(b => /Nghe đáp án|^Nghe:/.test(b.props['aria-label'] ?? label(b))).length, 0);
    const shown = buttons(CivicsQuestionCard({ ...props, revealed: true }));
    const main = shown.find(b => label(b).includes("Nghe đáp án"))!;
    main.props.onClick!();
    const alternatives = shown.filter(b => b.props['aria-label']?.startsWith("Nghe:"));
    alternatives.forEach(b => b.props.onClick!());
    assert.equal(alternatives.length, row.answers.length - row.requiredAnswers);
    assert.deepEqual(calls, [row.answers.slice(0, row.requiredAnswers).join(" "), ...row.answers.slice(row.requiredAnswers)], row.id);
  }
});
test("speech playback status handles replay, completion, failure, and stale callbacks", () => {
  const requests: { error: () => void; end?: () => void }[] = [];
  const statuses: boolean[] = [];
  let cancels = 0;
  let errors = 0;
  const player = createAudioPlayer({ createAudio() { throw Error(); }, cancelSpeech() { cancels++; }, speak(_text, _rate, error, end) { requests.push({ error, end }); } });
  const play = () => player.play("Republic", 0.75, () => { errors++; }, undefined, undefined, value => statuses.push(value));
  play(); play();
  assert.deepEqual(statuses, [true, false, true]);
  requests[0].error(); requests[0].end?.();
  assert.equal(errors, 0);
  assert.equal(statuses.at(-1), true);
  requests[1].end?.();
  assert.equal(statuses.at(-1), false);
  play(); requests[2].error();
  assert.equal(errors, 1);
  assert.equal(statuses.at(-1), false);
  player.stop();
  assert.equal(cancels, 4);
});
