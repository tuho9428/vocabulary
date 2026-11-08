import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { allItems } from "../src/lib/content.ts";
import { adaptVocabulary, type SourceSet } from "../src/lib/content-adapter.ts";
import {
  finalSoundTip,
  normalizeFinalSound,
  splitHybridReading,
} from "../src/lib/pronunciation.ts";
import { VOCABULARY_SETS } from "../src/data/civicsVocabulary.js";
import {
  CIVICS_2025_SOURCE,
  officialQuestions,
  questionTranslations,
} from "../src/data/civics2025Examples.js";

test("t/d/n/s/z produce short tips without adding sounds to the reading", () => {
  assert.equal(finalSoundTip("t"), "Không thêm tờ.");
  assert.equal(finalSoundTip("d"), "Không thêm đờ.");
  assert.equal(finalSoundTip("n"), "Giữ âm n ở cuối.");
  assert.equal(finalSoundTip("s"), "Đẩy hơi tạo tiếng sss.");
  assert.match(finalSoundTip("z")!, /không thêm nguyên âm/);
});
test("missing metadata yields no tip and other explicit phonemes get neutral guidance", () => {
  assert.equal(normalizeFinalSound(" /t/ "), "t");
  assert.equal(finalSoundTip(undefined), undefined);
  assert.equal(finalSoundTip("  "), undefined);
  assert.match(finalSoundTip("ʃ")!, /Không thêm nguyên âm/);
});
test("hybrid examples are rendering fixtures only and preserve every supplied character", () => {
  for (const [reading, ending] of [
    ["Két", undefined],
    ["Be(d)", "(d)"],
    ["Ten", undefined],
    ["Bơ(s)", "(s)"],
    ["Phây(s)", "(s)"],
    ["Ví(z)", "(z)"],
  ] as const) {
    const split = splitHybridReading(reading);
    assert.equal(split.ending, ending);
    assert.equal(split.base + (split.ending ?? ""), reading);
  }
  assert.deepEqual(splitHybridReading("Quát"), {
    base: "Quát",
    ending: undefined,
  });
  assert.equal(splitHybridReading("Be(d) thêm").ending, undefined);
});
test("explicit source finalSound is retained, trimmed, and never inferred", () => {
  const source = structuredClone(VOCABULARY_SETS) as SourceSet[];
  source[0].words[0].finalSound = " /t/ ";
  source[0].words[1].finalSound = "  ";
  const adapted = adaptVocabulary(
    source,
    officialQuestions,
    questionTranslations,
    CIVICS_2025_SOURCE,
  );
  assert.equal(adapted.items[0].finalSound, "/t/");
  assert.equal(adapted.items[1].finalSound, undefined);
  assert.ok(
    adapted.items.slice(2).every((item) => item.finalSound === undefined),
  );
});
test("only individually checked entries gain endings, including non-spelling-based d and z", () => {
  const reviewed = JSON.parse(
    readFileSync(
      new URL("../src/content/final-sounds.json", import.meta.url),
      "utf8",
    ),
  ) as Record<string, { finalSound: string; headword: string; source: string }>;
  const source = (VOCABULARY_SETS as SourceSet[]).flatMap((set) => set.words);
  for (const [index, item] of allItems.entries()) {
    assert.equal(
      item.finalSound,
      source[index].finalSound?.trim() || reviewed[item.id]?.finalSound,
    );
  }
  for (const [id, entry] of Object.entries(reviewed)) {
    assert.equal(
      allItems.find((item) => item.id === id)!.english.toLowerCase(),
      entry.headword,
    );
    assert.match(entry.source, /cmusphinx\/cmudict/);
  }
  assert.equal(
    allItems.find((item) => item.english === "decide")!.finalSound,
    "d",
  );
  assert.equal(
    allItems.find((item) => item.english === "taxes")!.finalSound,
    "z",
  );
  assert.equal(
    allItems.find((item) => item.english === "why")!.finalSound,
    undefined,
  );
});
