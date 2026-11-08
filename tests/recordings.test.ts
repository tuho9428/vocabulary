import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { allItems } from "../src/lib/content.ts";
import {
  findQuestionRecording,
  isLocalAudioPath,
  type AudioManifest,
} from "../src/lib/recordings.ts";

const manifest: AudioManifest = JSON.parse(
  readFileSync(
    new URL("../src/content/audio-manifest.json", import.meta.url),
    "utf8",
  ),
);
test("all manifest paths are bundled local files and missing future assets are omitted", () => {
  const rows = JSON.parse(
    readFileSync(new URL("../src/data/civics.json", import.meta.url), "utf8"),
  ) as { audio?: { question?: { en?: string } } }[];
  const exists = (path: string | undefined) =>
    !!path && existsSync(new URL("../public" + path, import.meta.url));
  assert.equal(
    manifest.questions.filter((row) => row.questionAudio).length,
    rows.filter((row) => exists(row.audio?.question?.en)).length,
  );
  for (const row of manifest.questions)
    for (const src of [row.questionAudio, row.answerAudio])
      if (src) {
        assert.equal(isLocalAudioPath(src), true);
        assert.ok(existsSync(new URL("../public" + src, import.meta.url)));
      }
  for (const src of Object.values(manifest.words)) assert.ok(exists(src));
  assert.equal(
    manifest.questions.some(
      (row) => row.questionAudio === "/audio/civics/en/Q47en.mp3",
    ),
    exists("/audio/civics/en/Q47en.mp3"),
  );
});
test("different numbering cannot attach a recording to the wrong 2025 question", () => {
  const supreme = allItems.find((item) => item.questionId === 2)!;
  assert.equal(supreme.question, "What is the supreme law of the land?");
  assert.equal(
    supreme.questionAudio,
    existsSync(new URL("../public/audio/civics/en/Q1en.mp3", import.meta.url))
      ? "/audio/civics/en/Q1en.mp3"
      : undefined,
  );
  assert.equal(
    allItems.find((item) => item.questionId === 1)!.questionAudio,
    undefined,
  );
  assert.ok(
    allItems.every(
      (item) => item.answer === undefined && item.answerAudio === undefined,
    ),
  );
});
test("answer recordings require matching both the question and approved answer text", () => {
  const question = "What is the supreme law of the land?";
  assert.equal(
    findQuestionRecording(manifest, question, "The Constitution.").answerAudio,
    "/audio/civics/en/A1en.mp3",
  );
  assert.equal(
    findQuestionRecording(manifest, question, "A different answer").answerAudio,
    undefined,
  );
  assert.equal(
    findQuestionRecording(manifest, "A different question", "The Constitution.")
      .questionAudio,
    undefined,
  );
});
test("audio paths reject remote URLs, traversal, and absolute filesystem paths", () => {
  for (const path of [
    "https://example.com/a.mp3",
    "/audio/../secret.mp3",
    "C:/audio/a.mp3",
    "//audio/a.mp3",
    "/audio/a.js",
  ])
    assert.equal(isLocalAudioPath(path), false);
});
