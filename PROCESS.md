# Process overview

A reading-guide to how the work came together --- a map to the process, not an
essay about it.

## What I built

The title screen and Act I ("Pulse") of *Where the Beat Leans*, a five-act
interactive music explainer scoped down to a single vertical slice: a
VexFlow-engraved percussion staff playing eight eighth notes on a synthesized
practice-pad voice, three annotation call-outs that walk a visitor through
"give the bar some weight," two real hit-target buttons on beats 1 and 3, and
a bar-boundary-gated pattern swap into an accented, settled state --- all
timed against `AudioContext.currentTime`, not `setTimeout`.

## The moments that mattered

1. **Reading the brief's own reference image against its prose, before
   writing any renderer code.** `EXHIBITION_FLOW.md` could be read as asking
   for a collapsed one-line rhythm staff, but the mood image showed a
   conventional 5-line staff with a percussion clef. I locked the correct
   reading in as a project rule before `notation.ts` existed, rather than
   discovering the mismatch after building the wrong thing:
   [`3d176d8`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Asuka121380/commit/3d176d81ce7fcc24280d45eadcc846d40a9f2e34).
   That rule is what `notation.ts`'s `stave.addClef("percussion")` was written
   against from the first commit
   ([`79ebe4c`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Asuka121380/commit/79ebe4cc5300f4abf5260ff58ae323813a1dfb16)),
   not a fix applied after a wrong first pass.

2. **Synthesizing the practice-pad hit instead of sourcing a bundled sample.**
   The brief asks for a CC0 drum sample even in phase one, but under a
   same-day deadline a mis-attributed or dead-linked sample was a real risk I
   couldn't fully rule out, and the target sound ("dry, neutral, stick on a
   practice pad") is a textbook synthesis case anyway. Rather than silently
   swapping approaches, I wrote the deviation and its reasoning into
   `CLAUDE.md` itself
   ([`3d176d8`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Asuka121380/commit/3d176d81ce7fcc24280d45eadcc846d40a9f2e34)),
   then implemented it as a filtered-noise-burst-plus-envelope voice in
   `src/audio-voices.ts`
   ([`2a0d83c`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Asuka121380/commit/2a0d83cb0dc07d828f9eaff240689e14345ab3e5)).
   Checking it was right meant listening to it in the browser, since no
   automated test can judge timbre.

3. **A real-browser pass at both marking viewports found two bugs that a
   green `pnpm check` had already hidden.** After Milestone 5 landed with
   62/62 tests passing
   ([`c1ecba4`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Asuka121380/commit/c1ecba4df4e5d9f85b98e26165226e492b8358d6)),
   I loaded the page with `agent-browser` instead of trusting the green
   check, per this project's own `CLAUDE.md` rule against accepting a
   visually plausible score unchecked. An in-page timing log showed Act I
   reaching `annotation-3` in ~7s instead of the intended ~10s, and a
   screenshot showed the annotation text overlapping the staff. Tracing the
   first bug back to `audio-scheduler.ts`'s look-ahead loop showed it fired
   `onBarBoundary` on its own first tick, before any bar had actually played
   --- a classic scheduler off-by-one that no unit test had caught, because
   the module had no unit tests: it was documented as needing a real
   browser. I fixed it with a one-flag guard and, rather than leave it
   unverifiable again, extended this project's injectable-dependency pattern
   (already used for `AudioContext` and `matchMedia`) to the scheduler's
   clock, adding a fake-clock regression test that pins the fix down for any
   future change. The layout bug I fixed by reserving margin around the
   staff and anchoring annotation text outside it rather than flush against
   its edge. Re-verifying live at 1920x1080 and 390x844 --- corrected timing,
   both call-out arrows, keyboard-only interaction, `prefers-reduced-motion`,
   and state surviving a mid-interaction resize --- is what told me it was
   actually fixed, not just recompiled:
   [`c1ecba4...2a0097c`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Asuka121380/compare/c1ecba4df4e5d9f85b98e26165226e492b8358d6...2a0097c718a64137e12e4499697dd510083bb476).

4. **A second real-browser pass at both marking viewports, on 2026-08-16,
   found seven things a green `pnpm check` still couldn't see.** Static
   checks can't judge typography, timing feel, perceptual contrast, or
   whether a navigation affordance exists at all, so after the visual-polish
   pass shipped at
   [`7cafec3`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Asuka121380/commit/7cafec35c4fc4f0b2c0cada483c768be26b42c12)
   I loaded the deployed shape in a real browser again rather than trusting
   the passing suite. Observed → why it weakened the exhibition → what I did:
   - The title still read as a typeset book (body's serif stack on the
     heading) despite the brief's hand-drawn framing, so it didn't establish
     the sketchbook feel before anything else on the page. Applied the
     already-vendored Caveat font to the heading and title copy.
   - "Tap to begin" was a heavy oval button with a separate "or press Enter"
     line, and that Enter claim was actually false --- `title-screen.ts` never
     attached a `keydown` listener, so the stated affordance didn't exist.
     Replaced both with one transparent full-screen hit-area and a single
     small "click anywhere to begin" prompt, and wired a real Enter/Space
     listener guarded on the same `activated` flag as the click handler.
   - The visual playhead visibly trailed the audible hit. The scheduler was
     computing the cursor's move-delay as a bare `(time - currentTime) * 1000`,
     which silently ignores output latency, and `.playback-cursor`'s 120ms
     CSS transition added further visible lag on top of that. I wrote a new
     `audio-clock-sync.ts` that maps a target `AudioContext` time to
     wall-clock time via `getOutputTimestamp()` (falling back to
     `outputLatency`/`baseLatency`), covered it with fake-clock unit tests for
     all three branches, and shortened the CSS transition so the marker's
     arrival tracks the corrected delay instead of gliding in late.
   - Accented beats weren't perceptually distinct from unaccented ones ---
     `BASE_VELOCITY`/`ACCENT_VELOCITY` were only a ~1.6x gain ratio. I widened
     it to a ~2.5x ratio and gave accented hits a firmer attack and brighter
     filter cutoff in `audio-voices.ts`, and added a `DynamicsCompressorNode`
     limiter so the louder accent can't clip the master output.
   - The annotation sequence advanced after one bar with a same-tick content
     swap, so nothing actually read as "fade out, then fade in" --- it was
     "vanish, then appear." I raised each annotation's hold to a full two
     bars and rewrote `syncAnnotation` in `main.ts` as an explicit two-phase
     crossfade (fade out on a cancellable timeout, then swap and fade in),
     gated on bar boundaries so it stays timer-independent of wall-clock
     guesses.
   - There was no way to leave Act I and return to the title screen, and nor
     could there ever be a forward "Next" --- a visitor who started the
     exhibition had no way back. Added a reusable `returnToTitle()` state
     transition and a `.back-nav` control (hand-drawn curved arrow,
     `>=44x44` touch target, keyboard-accessible) that tears down the
     departing act's `AudioContext`/scheduler and re-arms the title screen's
     first-activation path cleanly, so a visitor can leave and restart
     without a stale listener or a second gesture required.

   I verified all seven live with a headless-Chromium pass at 1920x1080 and
   390x844 (screenshots and a described audio-timing/accent-contrast console
   probe standing in for the parts I can't literally listen to or see
   myself): click/tap-anywhere starts the exhibition while a click exactly on
   the mute-toggle does not, Enter and Space both work, the cursor advances
   at a regular cadence consistent with the corrected latency mapping, each
   annotation holds for two full bars with a visible fade, back-nav returns
   to a clean and restartable title screen via both mouse and keyboard, and
   a mid-interaction resize preserves exhibition state. That review-fix work
   landed in
   [`89a6c0a`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Asuka121380/commit/89a6c0ad57ddfe4b9a1481d8af54ca4a89152f6c):
   [`7cafec3...89a6c0a`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Asuka121380/compare/7cafec35c4fc4f0b2c0cada483c768be26b42c12...89a6c0ad57ddfe4b9a1481d8af54ca4a89152f6c).

## Before you ship

`pnpm check:evidence` verifies the citations above resolve to real commits,
that `reflections/assignment-1.md` exists, and that `CLAUDE.md` is present.
