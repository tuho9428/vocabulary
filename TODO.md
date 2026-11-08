# Implementation progress

## Simplified citizenship question interface

- [x] Keep one question visible with “Luyện câu hỏi” and the existing Câu current / total count; remove redundant question instructions and the extra footer hint.
- [x] Keep English large, audio replay prominent, and Hiện đáp án primary; reduce spacing while retaining 56px minimum touch targets.
- [x] Show Vietnamese immediately for questions from new-word learning; use an inline, keyboard-accessible “Xem tiếng Việt” disclosure for questions from reviewed words.
- [x] Move version, question number, revision, answer provenance, and document link into collapsed “Thông tin nguồn”; reset disclosures for each question.
- [x] Preserve all data, answer mappings, storage, and scheduling. Fix older test assumptions with explicit absent-reading/current-export fixtures rather than editing approved pronunciation data.
- [x] All 92 tests, lint, type checking, data validation, and production build pass. Verify learning and practice at 320px: no horizontal scroll, hidden answers, independent translation reveal, source expansion, English audio replay, and unchanged saved progress.

## Citizenship answer regression verification

- [x] Reinspect the actual 100 nested bilingual source answers and the vocabulary-to-card import path.
- [x] Extend data validation to the final vocabulary catalog: 39 matched examples, zero lost answer attachments; list 113 unmatched example IDs separately.
- [x] Render every matched example through LessonScreen, detect dropped English/Vietnamese attachments, and test saved-session restoration without changing progress or schedules.
- [x] Pass all 89 tests, lint, type checking, data validation, and production build. Browser confirms q001 answers The Constitution. / Hiến pháp. and restores the same question after refresh.
- [x] Keep the separate coverage gap explicit: 62 of 87 2025 questions have no exact question in the unversioned civics.json source. All 100 source answers remain intact; no version-number crosswalk or fabricated answers.

## Complete pronunciation template and human worksheet

- [x] Complete 152 stable-ID template keys: 3 preserved approved readings, 149 empty placeholders.
- [x] Export 152 UTF-8/BOM CSV rows in source order with English, Vietnamese meaning, reading, and separate finalSound.
- [x] Add an atomic, ID-validated importer with dry-run/override and conflict/missing summaries; never modify final sounds or delete entries.
- [x] Document editing/import workflow and test Unicode, CSV quoting, conflicts, blanks, unknown/duplicate IDs, and UI empty handling. Real unchanged import leaves all three files byte-identical.
- [x] All 86 tests, lint, type checking, data validation, and production build pass; browser confirms empty readings and final-sound tips work. No progress or scheduling changes.

## civics.json answers

- [x] Inspect all 100 source rows: answer is a nested object with en/vi strings, all nonempty.
- [x] Trace root cause: content.ts ignored civics.json curriculum data; adaptVocabulary read nonexistent example.answer; LessonScreen consequently rendered fallback.
- [x] Bundle all original questions/answers; normalize string, bilingual-object, and array answers losslessly.
- [x] Match active examples by exact English text and explicit compatible versions, keeping unspecified provenance visible; preserve original IDs and schedules.
- [x] Show question translation before reveal and actual English/Vietnamese answers after Hiện đáp án.
- [x] Validate 100/100 source/imported answers with zero lost/invalid/empty answers; separately report 62 unmatched 2025 questions.
- [x] Add regressions and pass all checks/build. Browser q001 → 2025 question 2 reveals The Constitution. / Hiến pháp.; refresh preserves progress and answers.

Current rule: pronunciation assistance is always visible in vocabulary review; only meaning and response buttons wait for reveal. This supersedes older hide-all notes below.

## Meaning-only recall: pronunciation always visible

- [x] Move the shared pronunciation guide outside the answer gate; only meaning/explanation and recall responses wait for reveal.
- [x] Show review cards in order: English, available Vietnamese reading, audio, available ending tip, reveal button.
- [x] Apply to due reviews, Luyện tất cả, daily reviews, and retries; preserve learning behavior and all source data.
- [x] Update rendered-card regressions and documentation to the new rule.
- [x] Browser-test every review entry point, Why → Quai, absent fields, both responses, retries, refresh, and unchanged early-practice dates.
- [x] All 69 tests, lint, typecheck, and production build pass; browser console clean. No scheduling, progress, ID, or source-data changes.

## Review pronunciation investigation

- [x] Trace home review, daily review, and stored session IDs: all use full current catalog data and the same PronunciationGuide.
- [x] Confirm the user's open revealed “what” review card shows its /t/ tip; no dropped-finalSound defect reproduced.
- [x] Identify limited coverage: only five of 152 words have verified finalSound; missing tips on other words are intentional.
- [x] Add rendered-TSX regression tests for both flows, missing metadata, tips without pronunciationVi, and reloads; no new dependency.
- [x] All 65 tests, lint, type checking, and production build pass. No scheduling, progress-schema, ID, source-data, or working renderer changes.

## Automatic pronunciation-tip visibility

- [x] Keep ending tips automatic in learning and automatically visible after review answer reveal.
- [x] Replace the hybrid-notation disclosure with a short inline note; no extra control or click.
- [x] Keep tips visually secondary (20px), below 24px readings and the larger English word.
- [x] Browser confirms automatic learning tips, one-click review reveal, no extra pronunciation controls, and secondary type sizes; all 59 existing tests, lint, and type checking pass. Persistence code unchanged.

## English ending sounds

- [x] Add optional finalSound to study items and the source adapter; retain existing readings and IDs.
- [x] Individually check five existing words against CMUdict phonemic entries, with references; never derive endings from spelling.
- [x] Support highlighted parenthesized ending markers in supplied readings without changing their text.
- [x] Show short t/d/n/s/z tips and an optional explanation; keep all pronunciation hints hidden before review reveal.
- [x] Test missing/unknown endings, unchanged hybrid notation, original-English/en-US replay, no autoplay, saved dates, refresh, and review reveal; browser console clean.
- [x] Update documentation; 59 tests, source validation, lint, type checking, and production build pass.

## Vietnamese pronunciation update

- [x] Inspect source reading guides; preserve IDs, meanings, source files, and saved progress.
- [x] Add optional pronunciationVi, preferring supplied source values and using only three user-supplied readings as supplements.
- [x] Show English, Vietnamese reading, meaning, and English audio in learning mode; no IPA or legacy reading guide by default.
- [x] Hide reading and meaning in all review/retry modes until Hiện đáp án.
- [x] Verify learning, review reveal, replaying original English/en-US, missing reading, unavailable speech, scheduling, and refresh persistence in the browser.
- [x] Update documentation; 54 tests, source validation, lint, type checking, and production build pass.

## Recorded audio support

- [x] Inspect civics.json and existing public/audio/civics files without modifying source data.
- [x] Match recordings by exact text, preserving the existing 2025 bank and its IDs.
- [x] Prefer recordings for words/questions/approved answers; use browser speech as fallback.
- [x] Stop previous playback on repeat taps, navigation, and unmount; ignore stale playback failures.
- [x] Document adding future word recordings and syncing the manifest.
- [x] Verify actual MP3 playback, missing-file fallback, cancellation, 51 tests, lint, type checking, and production build.

## Requested update — real data and flexible learning

- [x] Inspect read-only source: 152 words, 12 groups, 87 questions/translations; no answers/audio/2008 bank.
- [x] Adapt and validate source data without changing IDs or source files.
- [x] Migrate existing progress and interrupted sessions without losing unmapped data.
- [x] Make three new words a recommendation; add optional extra learning.
- [x] Add independent due-first review and early practice that preserves due dates.
- [x] Update learner-facing wording, home actions, and completion actions.
- [x] Verify engine, source parity, persistence, migration, wording, and browser flows.
- [x] Run lint, type checking, and production build; update documentation.

## Phase 1 — Foundation

- [x] Set up Next.js App Router, TypeScript, and Tailwind.
- [x] Define modular folders and study/progress types.

## Phase 2 — Accessible UI

- [x] Vietnamese home, learning, recall, practice, and completion screens.
- [x] Large text and accessible controls; responsive layouts.

## Phase 3 — Learning engine

- [x] Deterministic daily assignments and due reviews first.
- [x] Spaced repetition and bounded missed-word retries.
- [x] Resume unfinished sessions; prevent duplicate daily assignments.

## Phase 4 — Persistence and audio

- [x] Validated versioned localStorage and recovery behavior.
- [x] English speech synthesis with graceful fallback.
- [x] Family-only test version and language preferences.

## Phase 5 — Verification

- [x] Unit/source tests: scheduling, migration, source parity, recorded playback, fallback, and cancellation (51 passing).
- [x] Browser checks: refresh, persistence, full learning flow, mobile (320px and 390px).
- [x] Lint, type checking, and production build (Webpack).
- [x] README: setup, deployment, content limitations.

## Future work — outside MVP

- [ ] Independently audit the supplied 2025 questions/translations against USCIS, and add verified answers and the missing 2008 bank.
- [ ] Validate speech and usability with the learner on their own phone; device voices vary.
- [ ] Optional progress export/import and cross-device synchronization.
- [x] Recorded-audio preference and browser-speech fallback.
- [ ] Optional offline support.
