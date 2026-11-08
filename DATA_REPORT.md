# Source data validation

## Vietnamese reading guides

`finalSound` is optional and is never derived from spelling. Five existing entries have explicitly checked final phonemes from [CMUdict](https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict): what (t), decide (d), citizen (n), Congress (s), and taxes (z). `src/content/final-sounds.json` records the headword and source link for each. These are phonemic checks, not claims that Vietnamese approximations have received expert review. Existing Vietnamese readings remain unchanged. The catalog does not add cat, bed, ten, bus, or face; their hybrid examples are only test fixtures.

The vocabulary source has 152 English-style respellings and no `pronunciationVi` entries. Those original fields, IDs, and meanings remain unchanged. The optional Vietnamese field reuses explicit source values when supplied; a separate `src/content/pronunciation-vi.json` currently adds only the user's three examples (what → Quát, why → Quai, how → Hao), by existing ID. The remaining 149 readings are omitted, without transliteration or guessed phonetics. Legacy English respellings are retained for compatibility but are not rendered on vocabulary cards.

## Recorded audio addition

`src/data/civics.json` supplies 100 bilingual question/answer records with audio paths but no test-version/source metadata. Its numbering differs from the active 2025 source. It is used only as an audio index, matching exact English question text and, where an active item already has an approved answer, exact answer text. Its answers are not imported into the curriculum.

At this update, 34 English question recordings and 34 English answer recordings exist under `public/audio/civics/en`, alongside four Vietnamese files. Six distinct recorded questions match 11 examples in the active bank. The 132 English paths referencing absent future files are omitted by `npm run sync:audio`; no missing-file request is needed to discover them. No individual word recordings exist yet. Add these at `public/audio/civics/words/en/<word-id>.mp3` and sync to enable them.

The statements below about absent audio describe the original vocabulary modules. Recorded assets now augment those modules without changing their contents, IDs, or test version.

The authoritative `src/data` directory is inside this Next.js repository. Its three files were read without modification. Next.js bundles the imported modules; the deployed app never reads an absolute Windows path. A copy/sync step is therefore unnecessary.

Run `npm run validate:data` to reproduce the counts, missing-field report, reference validation, and SHA-256 hashes. Run `npm test` for exact field-by-field parity against the source exports, duplicate detection, question reference checks, and the original source test.

| Source                     | Structure                                                                                                                                                                                        | Coverage                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| `civicsVocabulary.js`      | Internal tuple entries become `VOCABULARY_SETS`: set IDs/names plus word objects, stable IDs, English, Vietnamese, pronunciation guide, category, level, question IDs, and one bilingual example | 12 groups, 152 words                                |
| `civics2025Examples.js`    | Number-keyed `officialQuestions`, `questionTranslations`, and `CIVICS_2025_SOURCE` URL                                                                                                           | 87 English questions and 87 Vietnamese translations |
| `civicsVocabulary.test.js` | Existing Node test for set IDs, word IDs, fields, and example links                                                                                                                              | Runs unchanged in `npm test`                        |

The adapter preserves all 152 source IDs and their order, spelling, capitalization, Vietnamese meanings, pronunciation guides, categories, levels, question references, and example text. No duplicate IDs or case-insensitive English terms were found. All referenced questions and translations are present; no required fields or example inconsistencies were found.

## Missing data and provenance

- **No answers:** all 152 linked word examples lack answers. No answers are generated. Question practice reveals the supplied Vietnamese translation and offers the original source link.
- **No audio files:** all 152 words lack recorded audio. Browser English speech synthesis remains available.
- **No missing pronunciation guides:** all 152 words include a reading guide. These source guides are not represented as IPA.
- **No 2008 bank:** the supplied files only identify the 2025 test. The 2008 selection reports that data is unavailable and retains archived progress. No 2025 questions are relabeled as 2008.
- The source comments identify English questions as USCIS 2025, **M-1778, 09/25**, and provide the PDF URL. Those metadata are retained. This update verifies consistency with the supplied files; it does not independently audit the PDF or endorse translations as official USCIS translations. The source contains 87 questions, not the entire 128-question bank.

## Read-only source fingerprints

| File                       | SHA-256                                                            |
| -------------------------- | ------------------------------------------------------------------ |
| `civicsVocabulary.js`      | `a126ed49e031c1a63a057f189bb1fa329e6a0d9e4197ba1e4c01acd4817854e2` |
| `civics2025Examples.js`    | `de898a06090fefb562c6d3626daf7cb4f75c3c282de95b386856a4e406ed34af` |
| `civicsVocabulary.test.js` | `9bef9bfb0453b55ca508fb8302ca80e9a427507a9fe966745b7ee88d0523e163` |
