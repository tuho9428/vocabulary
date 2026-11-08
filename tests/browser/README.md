# Browser journey regression driver

`journey.mjs` exports `runJourneyAudit(stage)`. It uses DOM clicks and assertions in a real browser and requires no test dependency. It is separate from `npm test`.

1. Start `npm run dev` and open `http://localhost:3000` in a **new isolated test profile**. Never seed or reset a learner’s real profile.
2. Evaluate the file in the page with a browser automation tool: read its text, remove the leading `export` keyword, and wrap it in `async () => { /* file text */ return await runJourneyAudit("interrupt"); }`. Alternatively paste the function without `export` into DevTools and invoke it there. Keep the tested tab foregrounded because the driver waits for animation frames.
3. Run `interrupt`; reload the page; run `finish-first`, `early-review`, and `paused-extra` in order. Assertions throw on failure. `paused-extra` returns home with six learned words.
4. For the next-day scenario, reload with this initialization script **before app scripts**, then run `next-day`:

```js
const ActualDate = Date;
globalThis.Date = class extends ActualDate {
  constructor(...args) {
    if (args.length) super(...args);
    else super(2026, 10, 9, 12, 0, 0);
  }
  static now() { return new ActualDate(2026, 10, 9, 12).getTime(); }
};
```

The fixture dates intentionally correspond to November 8–9, 2026. Start the first stages with the test browser clock on November 8. Do not set the host clock.

5. At completion run `audio-failure`. It temporarily simulates absent speech, asserts the warning, advances a card, asserts that the old warning is gone, and restores the original speech property.
6. Separately test Back/Forward and skip-link focus without changing saved counts; compare storage before and after. Refresh mid-review and assert the current and paused cursors survive. These manual browser assertions, exceptional storage injections, exhaustion/overdue fixtures, multi-answer cards, real MP3 playback, and Lighthouse results are recorded in `UX_AUDIT.md` and `audit-evidence/browser-results.json`.

The driver double-clicks the same question continuation control to guard against advancing twice. It asserts hidden review meanings, visible readings/audio controls, no ending tips, official answers, no source links, preserved early-review dates, extra learning, exact paused-queue restoration, and due-date behavior. It never clears storage; the first stage refuses an existing profile.
