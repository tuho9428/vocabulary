# Full user journey audit

Audited November 8, 2026 (America/Los_Angeles). Scope: the existing Vietnamese-first learning app, without new learning features, services, or a redesign.

**Result: 8 verified issues found and fixed (1 P0, 2 P1, 5 P2). No known unfixed P0/P1 defect remains in the tested journeys.** The normal learning journey can be completed in the browser, but independent use by an elderly learner has not been established through a participant trial.

## Application and data examined

- Read README.md, TODO.md, DATA_REPORT.md, every screen, the engine, storage validation/migration, audio playback, source adapters, and existing tests before editing.
- Home → daily lesson → due vocabulary reviews → 1–3 recommended new words → up to three related citizenship questions → completion. Completion offers review, extra learning, or finish. Home and completion share the independent review chooser; voluntary review can pause a lesson.
- All 152 stable vocabulary IDs, Vietnamese meanings, imported readings, final-sound metadata, and original source files remain unchanged. Final-sound explanations remain absent from learner cards.
- Official answers resolve by explicit 2025 question number/version into the bundled 128-question bank. The unversioned 100-question source remains separate. Validation finds 120 static answer sets, eight explicit dynamic requirements, 149 vocabulary examples with static answers, and three dynamic examples.
- Review intervals remain 1, 3, 7, 14, and 30 days. Successful early practice preserves the due date; forgotten words return tomorrow with one bounded retry. Missed days do not reset progress. Dates use the local calendar and UTC date arithmetic.
- The historical localStorage key `cung-ong-hoc:v1` and schema version 2 remain unchanged. It saves IDs, schedules, assignments, responses, current/paused queues, and preferences. No database, authentication, or service was added.

## Findings and verified fixes

| ID | Severity | Problem and root cause | Fix | Verification |
| --- | --- | --- | --- | --- |
| UX-01 | P0 | If a recovery or v1 upgrade backup could not be written, loading returned a usable state but later commits could overwrite the only original copy. Browser reproduction: selectively reject backup writes while allowing the main key; starting a lesson replaced the old progress and left no backup. | Failed backup/read paths return an explicit write block. The app continues in memory, preserves the original key, and tells the learner saving is unavailable. A successful recovery backup still permits a fresh saved lesson. | Regression tests cover failed recovery and upgrade backups, successful recovery, and blocked reads. Browser confirms the original is byte-identical after starting and answering a card when backup writes fail. |
| UX-02 | P1 | Views existed only in React state. Browser Back left the app for about:blank rather than returning to the preceding screen. | Synchronize screens with browser history and restore Back/Forward views. Preserve session state and reset transient reveal/audio feedback. Initialize after hydration and let Next synchronize its history metadata. The skip link stays within the current screen. | Browser Back/Forward returns to the prior view without changing learned totals. Repeated reloads retain `#lesson`, word `who`, and cursor 1. Navigation parsing has a unit regression. |
| UX-03 | P1 | Home checked only the active session. After finishing a voluntary review and using its home button, a paused lesson was labelled “Bắt đầu học” with no resume explanation. | Count a paused lesson as unfinished; show “Tiếp tục học” and the existing resume explanation. | Rendered home regression plus browser pause/review/finish/home/resume assertions restore the exact extra-learning queue at cursor 1. |
| UX-04 | P2 | Home promised “Tiến độ tự lưu” even when storage access was blocked or a save failed. The success claim was unconditional. | Pass actual storage availability to home; show “Chưa lưu được tiến độ…” when saving is unavailable. Keep the detailed warning. | Rendered regression and browser blocked-getter injection show the warning and no false automatic-save claim; lessons remain readable. |
| UX-05 | P2 | At 320×740, decorative/repeated copy, wrapping, and spacing pushed the primary start control to y≈939, completely outside the first screen. | Shorten the daily title to “Bài học hôm nay”; reduce mobile spacing and narrow-header wrapping, without shrinking learning words or primary controls. | Fresh profile at 320×740: start spans y=641.3–711.3, height 70px; document width stays 320px. Screenshot retained. Error warnings intentionally take priority and may push actions lower. |
| UX-06 | P2 | Family/help targets were only 48–51px; task labels could be 10–14px, and saving guidance was 12–13px. | Minimum 56px family/help controls, larger family text, 16px saving guidance, 18px field help, and 16–18px mobile study labels/progress. Replace the fixed three-word home statement with wording that also fits one/two-word settings. | Browser measures family 88px at the narrow width, help 56px, review 62px, primary 70px. Learning/audio controls retain their 56px+ sizes. No horizontal overflow in inspected mobile states. |
| UX-07 | P2 | An audio error notice survived recall/question advancement because only view navigation cleared it. A failure on one card therefore appeared under later cards. | Clear card-specific audio notices on recall, feedback continuation, and question advancement. | Browser forces speech unavailable: warning appears, textual learning works, and the next card has no stale warning. A reusable browser regression covers this. Existing audio cancellation/fallback tests remain green. |
| UX-08 | P2 | Lighthouse measured the `/ 152` vocabulary total at 3.81:1 contrast, below the 4.5:1 requirement for its 22px normal text. | Use the existing darker muted-text color. | Lighthouse home accessibility improves from 96 to 100; the final snapshot has no failed accessibility audit. |

No official answers, vocabulary data, pronunciation imports, review intervals, or saved progress schema were changed to resolve these findings.

## Journeys exercised

Real Chrome was available. Tests used temporary test profiles on localhost; fixtures and Date overrides were restricted to those profiles. Scripted clicks, DOM assertions, snapshots, screenshots, storage inspection, media state, and Lighthouse were used. These checks are separate from Node tests and do not claim to be Playwright CI.

| Scenario | Evidence and outcome |
| --- | --- |
| A — First-time learner | Empty profile → empty review guidance → start → what / Quát / gì / cái gì → English audio control → three learned words → three question reveals → completion. Answers displayed: Republic; Executive branch; It says America is free from British control. Question answering did not alter vocabulary schedules. |
| B — Same-day return | Reload/new tab preserved learned progress. “Ôn lại” showed no due reviews; “Luyện tất cả” preserved due dates. “Học thêm” introduced the next genuinely unlearned batch. Six words were learned on the same date, beyond the three-word recommendation. |
| C — Following day | Before loading the app, override the local browser Date to November 9. Six reviews appeared plus one recommended new word. Correct due reviews moved to November 12; the forgotten word and its retry stayed due November 10. Seven words were learned in total. Existing missed-day tests verify no reset or penalty. |
| D — Interrupted learning/review | After answering word 1, reload restores word `who`, cursor 1, with the completed word saved once. Refresh during voluntary review restores review cursor 1, hidden meaning, reading `Hu`, and a separately paused extra lesson at cursor 1. “Tiếp tục học” resumes the exact paused queue. |
| E — Every review route | Home review, completion review, daily due reviews, all-learned practice, and retries retain English/reading/audio before reveal; only meaning and response buttons wait. No ending-sound guidance. Both responses and bounded retries exercised. All 152 learning-card render checks and retained-final-sound render regressions pass. |
| F — Citizenship | Versioned bank/source parity passes. Browser Q1 alternatives remain available; Q10 recommends two accepted answers (Equality, Liberty) and retains four others. A restored unresolved Speaker question reveals the safe fallback and “Bỏ qua”; skipping leaves vocabulary progress and history unchanged. No source link/control appears in the lesson. A real MP3 plays at 0.75 speed and stops on navigation. |
| G — Edges | No learned words; no due reviews; all 152 learned with no new words (extra learning disabled); 152 overdue words (152 reviews, zero new); interrupted review; invalid JSON and backup failure; blocked storage; unavailable speech; rapid repeated question taps; Back/Forward; narrow layout. The 152-word overdue browser check inspected queue creation, while engine tests cover bounded completion and scheduling. |

A short development-only Next overlay (“Unexpected end of JSON input”) occurred during rebuild/reload activity and disappeared on a clean reload; subsequent normal browser checks were clear. It was not reproduced as a learner-data exception, so no speculative application change was made for it. Browser contexts also reconnected during the audit; successful assertions were captured before those contexts closed.

## Browser artifacts and reproduction

- [Structured observations and browser-stage outputs](audit-evidence/browser-results.json).
- [Fresh first-use home at 320px](audit-evidence/first-home-320.jpg).
- [Home with seeded learned progress](audit-evidence/home-320.jpg).
- [Review before meaning reveal](audit-evidence/review-320.jpg).
- [Corrupt-storage recovery warning at 320px](audit-evidence/recovery-320.jpg).
- Reusable assertion driver: [tests/browser/journey.mjs](tests/browser/journey.mjs). See [browser run instructions](tests/browser/README.md). The driver intentionally refuses an existing profile for the initial stage and never clears user storage.
- New unit/render regressions: [tests/journey-audit.test.ts](tests/journey-audit.test.ts). They run with `npm test`.

Observed audio evidence: `/audio/civics/en/Q33en.mp3`, `paused=false`, current time 0.328103 seconds, playback rate 0.75; navigation paused it. Browser speech exposed three English voices. This proves invocation/playback state, not audible quality or intelligibility on the learner’s phone.

## Verification results

| Check | Result |
| --- | --- |
| Node unit, data, integration/render tests | 109 passed, zero failed (102 baseline + seven new regressions) |
| Browser interactions | Successful assertions listed above; browser script is an explicit separate driver, not part of `npm test` |
| Data validation | 152 words/readings; all 128 official records valid; no missing static answers, duplicate official IDs, changed source answers, or invalid mappings |
| ESLint | Passed without warnings |
| TypeScript | Passed |
| Production build | Passed; static app routes generated |
| Lighthouse home snapshot | Accessibility 100; manual learner/device testing still required |
| Preservation | Original data, imported readings, final-sound metadata, official bank, IDs, engine scheduling, and storage key/schema unchanged |

Some commands needed the approved unsandboxed execution path because Windows initially blocked dependency reads or build-output writes. Those sandbox failures are not reported as application failures or as passing checks.

The bundled pinned USCIS source was validated locally against all imported questions and answer bullets. The official [USCIS 2025 PDF](https://www.uscis.gov/sites/default/files/document/questions-and-answers/2025-Civics-Test-128-Questions-and-Answers.pdf) was also looked up; a direct live fetch returned HTTP 403, so this audit does not claim a fresh byte-for-byte comparison with the live PDF or verification of current officeholders. No dynamic answer was invented.

## Remaining limits and improvements, ranked by impact

1. **Highest impact: test with the actual learner on their own phone.** Normal first-use learning is technically completable without assistance; age-specific comprehension, hearing, dexterity, and confidence were not measured. Do not certify independent use from scripted browser success alone.
2. **Existing curriculum limits:** eight current/local questions need verified answers outside lessons; new practice deliberately excludes them. The vocabulary-led flow does not expose every question in the full bank. Vietnamese answer translations are absent for many official answers. A content/flow expansion needs a separate brief; existing translations and official English were preserved here.
3. **Device audio:** validate speaker volume, English voice quality, pronunciation clarity, and recorded/synthetic fallback on the learner’s device. Text remains usable after audio errors; intelligibility is unverified.
4. **Persistence:** browser data remains device/origin-specific. Recovery cannot save new work while storage is blocked; the app now says so and preserves the original. Export, cross-device sync, and offline guarantees remain outside this audit’s no-new-features scope.
5. **Manual accessibility:** the home snapshot score is not a full WCAG certification. Long questions still need vertical scrolling on very narrow phones. Test larger system text, screen readers, and real touch use with participants.

There are **zero known open defects among the eight verified findings**, with the limitations above explicitly outstanding. A first-time learner can traverse the complete normal lesson flow in the tested browser; an unconditional claim that an elderly learner can do so independently would require the participant/device validation above.
