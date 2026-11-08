# Cùng bạn học

A Vietnamese-first citizenship vocabulary app built with Next.js App Router, TypeScript, and Tailwind CSS. This update extends the existing app and preserves its accessible layout, audio, settings, deterministic scheduling, and browser-based persistence. No authentication, database, or API keys.

## Run

Requires Node.js 22.18+; Node 24 is recommended.

```sh
npm install
npm run dev
```

Open http://localhost:3000. For production:

```sh
npm run build
npm start
```

The scripts use Next.js's supported Webpack bundler because the supplied Windows environment could not start Turbopack's CSS worker.

## Learning modes

Vietnamese reading guides use the optional `pronunciationVi` field. Learning cards show the English word, an available Vietnamese reading, the original Vietnamese meaning, and the English speaker button. Review, voluntary practice, and retries always show available pronunciation assistance. Only the Vietnamese meaning and recall response buttons wait for **Hiện đáp án**. Old English-style respellings and IPA are not displayed by default.

The source vocabulary retains its English-style respellings. `src/content/pronunciation-vi.json` now supplies Vietnamese readings for all 152 existing vocabulary IDs, including what → Quát, why → Quai, and how → Hao. Empty strings, if encountered later, resolve to an absent reading in the UI. An explicit `pronunciationVi` in source data takes precedence. There is no automatic letter-substitution generator. Audio always plays the original English word in en-US or its matching recording. Playback is never automatic.

## Human pronunciation worksheet

Edit `src/content/pronunciation-worksheet.csv` in a UTF-8-capable spreadsheet editor. It has columns `id`, `english`, `vietnameseMeaning`, `pronunciationVi`, and `finalSound`, in the original learning order. It uses UTF-8 with a BOM for Vietnamese text in Excel, quoted fields, and CRLF rows. Only fill reviewed readings in `pronunciationVi`; all other columns are reference data.

```sh
# Preview the import without writing anything
npm run import:pronunciation -- --dry-run

# Import approved nonempty readings from the default worksheet
npm run import:pronunciation

# Read a different UTF-8 CSV
npm run import:pronunciation -- --input "path/to/reviewed.csv" --dry-run

# Explicitly allow replacing conflicting existing nonempty readings
npm run import:pronunciation -- --override
```

The importer matches only stable IDs and imports only `pronunciationVi`. It rejects unknown or repeated IDs, malformed CSV, and conflicting nonempty readings. A rejected import writes nothing, including otherwise valid additions. `--override` permits deliberate nonempty replacements; blank cells never erase approved readings. Missing worksheet rows leave existing entries intact. Output reports proposed added/unchanged/conflicting/overridden counts, remaining missing readings, and whether changes were applied. A dry run reports proposals only. Successful imports replace the JSON atomically and never touch final sounds, vocabulary data, or learning progress.

`npm run prepare:pronunciation` fills missing template keys and creates the worksheet if it does not exist, preserving an existing worksheet's manual edits. After importing edits, `npm run prepare:pronunciation -- --refresh-worksheet` explicitly rebuilds the worksheet from approved JSON and source metadata. Do not use that refresh flag before importing edits you want to keep. `final-sounds.json` remains separate; its phonemes are never inferred from the written English word or imported from CSV.

`final-sounds.json` and optional `finalSound` metadata remain intact for data maintenance, including the five reviewed entries and their source links. The learner UI does not render final-sound tips, labels, help boxes, or parenthesis explanations. Supplied readings, including any parenthesized text, display verbatim without highlighting individual ending sounds. English audio remains the pronunciation reference.

Home review, Luyện tất cả, daily reviews, retries, and restored sessions all use the same simplified pronunciation display. English, available `pronunciationVi`, and English audio are immediately visible; only the Vietnamese meaning and recall responses wait for **Hiện đáp án**. Final-sound guidance appears neither before nor after reveal. Progress still stores scheduling and queue IDs, and rendering or revealing does not change saved progress or review dates.

- **Daily learning:** review due words first, then a recommendation of up to three new words. Family settings can recommend one or two instead. With 5–9 due reviews the recommendation reduces to one; with 10+ it focuses on review. The daily count is derived from unique learned IDs and their local `learnedOn` dates.
- **Extra learning:** after a lesson choose **Học thêm** for the next 1–3 unlearned words. Repeat as often as desired. There is no hard daily cap; previously introduced words are never assigned again as new.
- **Review anytime:** choose **Ôn lại** on the home or completion screen. Review just due words, or voluntarily practice all learned words with due words first. This mode never introduces new vocabulary.
- **Completion:** choose **Ôn lại**, **Học thêm**, or **Hoàn thành**. Finishing returns home; it does not force more study. With no new vocabulary left, the app says **Bạn đã học hết các từ mới!** and offers review.
- **Resume:** an interrupted lesson shows **Tiếp tục học** on the home screen and resumes automatically on reload. Review may temporarily pause a vocabulary lesson; both sessions survive reload. Finishing the review restores the paused lesson.

New vocabulary starts with a review tomorrow. Successful due recall uses intervals of 3, 7, 14, and 30 days, capped at 30. Successful optional practice before a word is due **does not change its interval or postpone its due date**. If an early practice card becomes due across midnight, answering it counts as a due review. A forgotten word is scheduled tomorrow and gets one bounded retry later in the session. Remembering that retry still leaves it due tomorrow. Missing days does not reset progress.

English audio prefers a recorded file, with browser speech as fallback when no recording exists or playback fails. Rate and bilingual guidance remain configurable in the two-step family settings area. Text remains usable when audio is unavailable. There are no streaks, countdowns, forced animations, or notifications.

## Adding recorded or AI-generated audio

The app supports ordinary audio files; no AI service or API key is needed at runtime. Existing files in `public/audio/civics` are indexed using `src/data/civics.json`. That JSON uses a different numbering scheme and has no explicit test-version metadata, so **recordings** are matched by exact spoken English text, never by that file's question numbers. For example, its `Q1en.mp3` reads question 2 in the 2025 bank. This audio-only text lookup never supplies or changes an answer; 2025 answers resolve exclusively by versioned official IDs.

Currently 34 English question recordings and 34 answer recordings exist. Six distinct questions (11 vocabulary examples) match the active bank and have recordings. No isolated word recordings exist yet. The 132 referenced English files not yet present are omitted from the generated manifest. The supplied Vietnamese files are retained; current playback controls are for English.

To add a recording of an individual word, save an MP3 using its existing vocabulary ID:

```text
public/audio/civics/words/en/question-words-what.mp3
public/audio/civics/words/en/voting-citizenship-citizen.mp3
```

For question/answer recordings, use the paths already declared in `src/data/civics.json` and record exactly the corresponding English text. An answer recording is used only when its question and full answer text match the imported item; audio metadata never substitutes for missing answer content.

Then run `npm run sync:audio`. It regenerates `src/content/audio-manifest.json` with existing local files only. Sync also runs automatically before `dev`, `test`, and `build`. If the development server is already open, running sync enables newly added files without component edits. Commit the generated manifest and audio files with the app. Production uses bundled paths such as `/audio/civics/en/Q1en.mp3`, with no absolute filesystem dependency.

The selected listening speed applies to recordings as well as browser speech. Repeated taps restart playback; navigation and completing a card stop it. A failed recording falls back once, and canceled requests cannot start delayed speech on a later screen. Text remains available if both playback methods fail.

## Real source data

The read-only source is bundled directly from `src/data`:

- `civicsVocabulary.js`: 152 unique words in 12 groups.
- `civics2025Examples.js`: 87 English questions and Vietnamese translations, with a USCIS 2025 source URL and revision M-1778, 09/25.
- `civicsVocabulary.test.js`: original source tests, run unchanged.

The typed adapter preserves source word IDs, meanings, pronunciation guides, categories, levels, and question references. There is no generated placeholder vocabulary in the active catalog. The previous sample JSON remains an unused historical file.

The complete **128-question USCIS 2025 bank** is bundled in `src/content/civics-2025.json`, extracted from the [official USCIS M-1778 PDF](https://www.uscis.gov/sites/default/files/document/questions-and-answers/2025-Civics-Test-128-Questions-and-Answers.pdf). IDs are `uscis-2025-001` through `uscis-2025-128`; each record retains its official number, version, English question, every accepted answer bullet, source page, 65/20 marking, and existing Vietnamese question translation when available. Line wrapping and the separate asterisk marker are normalized without changing English wording. The existing 152 vocabulary IDs and translations remain unchanged. `attachOfficial2025()` resolves each vocabulary question through its explicit official question number and version, never text similarity or a different version's numbering.

There are **120 static questions with complete accepted answers** and **8 explicit dynamic requirements**: questions 23, 29, 30, 38, 39, 57, 61, and 62. Their original USCIS lookup instructions and territorial exceptions remain in `officialAnswers`; `answers` stays empty until verified current/local information is supplied. No officeholder names are silently substituted. These unresolved questions are excluded from new question-practice queues and listed separately in family settings with the USCIS update link. Their associated vocabulary words still remain available for learning. Existing interrupted sessions are preserved; an unexpected unavailable question offers **Bỏ qua**, advancing only the question cursor without grading or changing vocabulary progress, history, or review scheduling.

The previous 62 unmatched questions resulted from comparing the partial 2025 questions-only examples against an unversioned 100-question bank. The complete 2025 source now resolves all 87 distinct vocabulary question references: 149 examples have static answers, and 3 point to explicit dynamic requirements. The 41 official questions not referenced by current vocabulary examples are still included and validated in the complete bank; this update preserves the existing vocabulary-led session flow. The family `civics.json` remains intact and separately validated (100 bilingual records), with no answer joins into the 2025 bank. There is still no verified 2008 vocabulary bank. Missing Vietnamese answer translations never hide official English answers; translations are not invented or copied across versions.

Citizenship cards show one large question under **Luyện câu hỏi**, progress such as **Câu 1 / 3**, audio replay, and **Hiện đáp án**. Learning shows Vietnamese immediately; practice offers **Xem tiếng Việt** inline. Revealing the answer always shows the Vietnamese question translation if available, **ĐÁP ÁN**, a concise accepted English answer, an optional supplied Vietnamese answer translation, and **Tiếp tục**. Other accepted alternatives are behind **Các đáp án khác**. For questions requiring two, three, or five responses, the recommended answer includes that many official choices. All alternatives remain intact in the data. Source attribution and links live only in family settings, outside the lesson. Controls retain at least 56px touch targets.

`npm run validate:data` checks all 128 records, missing static answers, dynamic designations, duplicate IDs, source parity, and every active vocabulary mapping. It fails on missing or altered official answers; it runs automatically before the production build. The source PDF and extracted text are fingerprinted and checked in at `src/content/sources/`. Runtime uses bundled JSON without filesystem access, PDF libraries, external fetching, or absolute Windows paths.

To reproduce the import from the pinned original PDF (developer-only extraction dependency):

```sh
python -m pip install pypdf==7.0.0
python scripts/extract-uscis-2025.py
npm run import:uscis2025
npm run import:uscis2025 -- --check
npm run validate:data
```

`--check` does not write files. A changed PDF/extraction fingerprint must be reviewed before updating the importer. The generated JSON preserves existing question translations by official 2025 number. See [DATA_REPORT.md](DATA_REPORT.md) for current coverage and source hashes.

## Persistence and upgrades

The historical storage key `cung-ong-hoc:v1` is retained for discovery; its envelope is now **schema version 2**. It stores:

- Learned word IDs, original learned dates, intervals, due dates, remembered/forgotten counts, and last-review dates.
- Local-date assignment lists, including all extra batches without a three-word limit.
- Per-response history: word ID, date, learning mode, response, card kind, and whether scheduling changed.
- Current and paused sessions, queue positions, retries, question practice progress, preferences, and last-studied date.

New-word totals and the next unlearned words are derived from the catalog and saved learned IDs, avoiding redundant counters or cursor drift.

The version 1 migration backs up the complete original JSON to `cung-ong-hoc:before-v2` before saving. Existing authoritative IDs are preserved. Legacy sample IDs map to a real word only when English and test version match exactly; schedules and counts stay unchanged. Unmatched sample progress (including unsupported 2008 examples) remains under `archivedProgress`. The original assignments and session are also recoverable from the backup. Historical response timestamps are not invented.

Unfinished sessions map to available source IDs and resume at the corresponding position. Unsupported or removed sample cards are not taught as real content. The upgrade shows a Vietnamese explanation. Corrupt storage is backed up to `cung-ong-hoc:recovery`; unavailable storage or quota failures produce warnings. Other-tab changes pause interactions and request a reload.

Dates are local `YYYY-MM-DD` strings; UTC calendar arithmetic avoids daylight-saving drift. Cards answered after midnight use the actual new date while retaining the unfinished queue. Completed card responses save immediately. Audio playback and answer reveals are not graded events.

Progress stays in this browser and origin. Clearing site data removes it; there is no cross-device sync, export UI, service worker, or guaranteed offline audio.

## Checks

```sh
npm test
npm run validate:data
npm run lint
npm run typecheck
npm run build
```

Tests use Node's built-in runner. Coverage includes recommendations and unlimited extra batches, no duplicate introductions, due-first review, early-practice schedule preservation, failed recalls, calendar rollover, resume, paused lessons, version isolation, schema migration, corruption/quota recovery, real-data parity, and the Vietnamese pronoun update.

All **102 tests**, lint, type checking, data validation, and the production build pass. Coverage includes all 152 simplified vocabulary learning cards, hidden review meanings, absence of ending-sound UI before and after reveal, unchanged final-sound metadata, pronunciation worksheet/import safety, the complete official 2025 question bank, and saved-progress restoration. Removing the ending-sound UI leaves both pronunciation JSON files byte-identical. The scheduling algorithm, progress schema, source data, vocabulary IDs, and English audio functionality are unchanged.

Browser checks exercise three-word completion, extra learning, refresh resume, voluntary review without postponing due dates, next-day due reviews, migration, exhaustion, and narrow layouts. Actual speech availability and usability should also be checked on the learner's device.

The production dependency audit previously reported no advisories. Development-only ESLint dependencies reported moderate minimatch advisories; a forced major-version downgrade was not applied.

## Deploy to Vercel

1. Push this repository and import it into Vercel.
2. Choose the Next.js preset, Node.js 24, and the default install/build settings (`npm install`, `npm run build`).
3. Keep the default Next.js output directory. No environment variables are needed.

This update does not deploy the app. Localhost progress does not transfer automatically to a deployed origin.
