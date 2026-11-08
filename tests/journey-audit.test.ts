import test from "node:test";
import assert from "node:assert/strict";
import "./helpers/register-tsx.ts";
import { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { allItems } from "../src/lib/content.ts";
import { initialState, startSession, answerWord } from "../src/lib/engine.ts";
import { loadProgress, saveProgress, STORAGE_KEY, BACKUP_KEY, V1_BACKUP_KEY } from "../src/lib/storage.ts";
import { viewFromHash } from "../src/lib/navigation.ts";
const { HomeScreen } = await import("../src/components/home-screen.tsx");

const today = "2026-11-08";
const noop = () => {};

test("failed recovery backup prevents subsequent lesson saves from overwriting the original", () => {
  const original = JSON.stringify({ ...initialState(), session: { invalid: true }, progress: { recoverable: "old data" } });
  const values = new Map([[STORAGE_KEY, original]]);
  let primaryWrites = 0;
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (key === BACKUP_KEY) throw new Error("backup quota exceeded");
      primaryWrites++;
      values.set(key, value);
    },
  };
  const loaded = loadProgress(storage, allItems);
  assert.equal(loaded.writeBlocked, true);
  let state = startSession(loaded.state, allItems, today);
  state = answerWord(state, true, today);
  assert.equal(saveProgress(storage, state, loaded.writeBlocked), false);
  assert.equal(primaryWrites, 0);
  assert.equal(storage.getItem(STORAGE_KEY), original);
  assert.equal(Object.keys(state.progress).length, 1, "in-memory learning remains usable");
});

test("failed upgrade backup preserves v1 data throughout further in-memory learning", () => {
  const legacy = initialState();
  const original = JSON.stringify({ ...legacy, schemaVersion: 1 });
  let raw = original;
  const storage = {
    getItem: (key: string) => key === STORAGE_KEY ? raw : null,
    setItem: (key: string, value: string) => {
      if (key === V1_BACKUP_KEY) throw new Error("quota");
      raw = value;
    },
  };
  const loaded = loadProgress(storage, allItems);
  assert.equal(loaded.state.schemaVersion, 2);
  assert.equal(loaded.writeBlocked, true);
  assert.equal(saveProgress(storage, startSession(loaded.state, allItems, today), loaded.writeBlocked), false);
  assert.equal(raw, original);
});

test("successful recovery backup permits saving a fresh lesson", () => {
  const values = new Map([[STORAGE_KEY, "bad{json"]]);
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
  const loaded = loadProgress(storage, allItems);
  assert.equal(loaded.writeBlocked, undefined);
  assert.equal(saveProgress(storage, startSession(loaded.state, allItems, today), loaded.writeBlocked), true);
  assert.equal(values.get(BACKUP_KEY), "bad{json");
  assert.notEqual(values.get(STORAGE_KEY), "bad{json");
});

test("unreadable storage blocks writes and disables the automatic-save promise", () => {
  let writes = 0;
  const storage = {
    getItem: () => { throw new Error("blocked getter"); },
    setItem: () => { writes++; },
  };
  const loaded = loadProgress(storage, allItems);
  assert.equal(loaded.writeBlocked, true);
  assert.equal(saveProgress(storage, loaded.state, loaded.writeBlocked), false);
  assert.equal(writes, 0);
});

test("navigation resolves supported screens and safely handles missing sessions and the skip link", () => {
  for (const view of ["home", "lesson", "review", "family", "settings", "help"])
    assert.equal(viewFromHash(`#${view}`, true), view);
  assert.equal(viewFromHash("#lesson", false), "home");
  for (const hash of ["", "#main", "#unknown"]) assert.equal(viewFromHash(hash, true), null);
});

test("home offers Tiếp tục học when a finished review still holds a paused lesson", () => {
  const state = startSession(initialState(), allItems, today);
  state.pausedSession = structuredClone(state.session);
  state.session = { ...state.session!, queue: [], cursor: 0, phase: "complete", mode: "review", practiceIds: [] };
  const html = renderToStaticMarkup(createElement(HomeScreen, {
    state, bank: allItems, today, heading: createRef<HTMLHeadingElement>(), onStart: noop, onReview: noop, onHelp: noop,
  }));
  assert.match(html, /Tiếp tục học/);
  assert.doesNotMatch(html, /Bắt đầu học/);
});

test("home never promises automatic saving when storage is blocked", () => {
  const html = renderToStaticMarkup(createElement(HomeScreen, {
    state: initialState(), bank: allItems, today, heading: createRef<HTMLHeadingElement>(),
    onStart: noop, onReview: noop, onHelp: noop, storageAvailable: false,
  }));
  assert.match(html, /Chưa lưu được tiến độ trên thiết bị này/);
  assert.doesNotMatch(html, /Tiến độ tự lưu/);
});
