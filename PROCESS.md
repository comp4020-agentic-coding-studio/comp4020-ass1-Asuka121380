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

5. **The revised Title + Act I was reviewed live and locked as the
   exhibition's design system, not just Act I's.** After
   [`89a6c0a`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Asuka121380/commit/89a6c0ad57ddfe4b9a1481d8af54ca4a89152f6c)
   and the earlier process write-up in
   [`0c480d3`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Asuka121380/commit/0c480d31938a0c0e2bec07637a647e427fd4eae1),
   I reviewed the running page again in a real browser and approved its
   typography, manuscript-paper aesthetic, layout, handwritten navigation,
   annotation pacing, accent contrast, and overall visual direction as-is.
   From that point on this became a locked baseline: Acts II-V, the
   laboratory, and the acknowledgement page were required to extend this
   design system, never redesign it. The one open Act I request left on the
   table was making Space toggle pause/resume rather than only start
   playback. I implemented that and wrote the locked-baseline rule itself
   into `CLAUDE.md` in the same commit, so every later milestone had the
   constraint in front of it before writing any new scene:
   [`af83c41`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Asuka121380/commit/af83c415e93c63503c6dbdaabf3981023e5bc35c).
   `focusOwnsSpaceKey()` defers to whichever control already owns focus so a
   Space press never double-toggles; verified live at both viewports that
   Enter still starts the exhibition, Space pauses/resumes with nothing
   focused, Space on the focused play/pause button fires exactly once, and
   Space on focused back-nav returns to title via its own native semantics.
   pnpm check: 74/74.

6. **Act II asks what "weight" costs an existing rhythm, not what a new one
   sounds like** — same eight eighth-notes as Act I, but the accent flips
   from 1&3 to 2&4 and back, so a visitor hears the same pattern read two
   different ways before Act III adds real instruments. It reuses Act I's
   staff, crossfade, and control conventions untouched, driven by a new
   discriminated `Act1Screen | Act2Screen` state so the two acts can't leak
   into each other's steps. A real-browser pass caught two bugs static
   checks couldn't: `selectableTargets()` guarded only on step *name*, so
   Act II's own `annotation-3` (reusing Act I's step label) would have
   wrongly re-armed Act I's tap-to-accent targets — fixed by guarding on act
   as well as step; and the flip-accent control showed disabled through all
   of Act II instead of staying hidden until the inversion prompt and hiding
   again once settled — fixed with `isFlipControlVisible()` and covered by
   new tests. Responsive behaviour (annotation stacking, touch targets) is
   the same `@media (width <= 780px)` rule Act I already used. Verified live
   at both viewports: full Act I→II handoff, all five annotations, the flip
   control's reveal/disable/hide lifecycle, both comparison rounds, back-nav
   from inside Act II, and state surviving a mid-interaction resize — zero
   console errors. 25 new tests; pnpm check 102/102:
   [`3124532`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Asuka121380/commit/31245325aa081515ed1dfe635336d805be1632a4).

7. **Act III turns the single practice-pad voice into a full drum kit and
   introduces the 3-3-2 kick displacement** — continuous hi-hat on every
   eighth, snare fixed on the backbeat, and a guided kick move from the
   plain 1-and-3 pattern to kick-on-1/offbeat-after-2/4. This is the first
   scene with two simultaneous VexFlow voices on one stave (upstem
   hi-hat/snare beamed continuously, downstem kick beamed only across
   contiguous runs), and the first to generalise Act I's single-arc
   annotation primitive into group braces and an arbitrary arc between two
   named beats. Real-browser and manual notation inspection (clef, notehead
   line, beaming, accent placement — never trusting a score that merely
   renders without throwing) confirmed both guided kick moves land correctly
   and the closing basic/3-3-2 comparison round-trips. 31 new tests; pnpm
   check 140/140, zero console errors at both viewports:
   [`f3f6f16`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Asuka121380/commit/f3f6f167b673b99f055f78267c0900fe180ac49a).

8. **Act IV adds a second, independent voice (bass) that first locks to the
   kick, then answers it instead** — a real bass-clef stave beneath the
   drum-kit stave, with alignment lines and a circled "locks." while the two
   voices coincide, then three arcs pairing each locked attack to where the
   bass moves to once it becomes syncopated. A real-browser pass found a
   shared-foundation layout bug, not an Act IV-only one: `.staff-frame`'s
   height and VexFlow's stave-centering formula both derive from the same
   container height, so `.score-stage`'s flex-centering silently absorbed
   the frame growth needed for the second stave and left the bass stave
   clipped. Fixed by anchoring the stave to a fixed y-offset once a bass
   voice is present (so added frame height becomes visible room, not
   centering slack) rather than special-casing Act IV's layout. Verified
   live at both viewports: bass clef, C3 notehead placement, rests,
   alignment lines, and all three arcs render correctly. 54 new Act IV
   checks; pnpm check 168/168:
   [`f063113`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Asuka121380/commit/f0631134fe0ead777e54fe02acb1a1595eb8e32e).

9. **Act V moves from locking/answering into a full call-and-response
   conversation** — kick calls beat 3, bass answers the offbeat after beat
   3 — after a crowding fix moves a low voice off the offbeat after beat 4,
   then resolves into a full-performance playback of the combined groove
   plus a five-line closing sequence. This is the exhibition's musical
   payoff: every earlier act's relationship (equal pulse → accent placement
   → backbeat reversal → full kit → 3-3-2 → lock → answer) converges into
   one groove a visitor hears played straight through. Built entirely on
   existing seams (`selectTarget`/`triggerX` from Acts III-IV, the shared
   `positionArcs` helper from Acts I and IV) rather than new mechanisms.
   Verified live at both viewports: the crowding-fix interaction, the
   call/response itself, the annotation crossfade mid-transition, the
   full-performance playback on both staves, and the settled extension seam
   continuing playback without stray UI. 195 tests green:
   [`260082b`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Asuka121380/commit/260082b6da10e26fc4af67f6a09d47188a326ffc).

10. **The laboratory hands the instrument to the visitor** — free-play
    drum-kit + bass grid, mute toggles, tempo/volume, 7 presets, and 5
    relationship-highlighting tools — followed by the acknowledgement page's
    replay/return links, closing the exhibition's arc from guided listening
    to independent experimentation. Two shared-foundation defects surfaced
    here, both fixed in the shared code rather than laboratory-only patches:
    VexFlow's collision heuristic re-centred a rest's notehead toward the
    midpoint of neighbouring voices whenever kick/bass both rested at the
    same tick as active notes either side (it reasons only in stave-relative
    line numbers, with no awareness that the kick/bass voices are joined
    for x-alignment across two physically separate staves) — fixed by
    re-pinning every rest to its instrument's fixed line right after
    formatting; and the laboratory's per-row click-target band used one
    fixed 20px half-height for all four instrument rows, but the real gaps
    between rows vary (as little as ~20px between snare and kick), so
    adjacent rows stole each other's clicks — fixed by deriving the band
    from the smallest gap actually present at render time. Verified live at
    both viewports: the full title→Act I-V→laboratory→acknowledgement
    journey, every mute/playback/tempo/volume/preset/tool control, keyboard
    shortcuts (digits 1-7, R), arrow-key grid navigation, the adjacent-row
    click-stealing regression at real row-boundary pixels, and
    `prefers-reduced-motion` (draw-on suppressed, opacity fades kept). Zero
    application bugs found in this milestone itself; pnpm check 239/239:
    [`232843b`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Asuka121380/commit/232843b9cd8165ec9bb712449ccb767da975655e).

11. **A full-journey integration pass, on 2026-08-17, found one more
    shared-foundation defect a green suite couldn't see.** With all five
    acts, the laboratory, and the acknowledgement page in place, I walked
    the complete title-to-acknowledgement path twice at both viewports:
    back-nav from every act, a full restart-to-title cycle, header
    mute-toggle isolation, keyboard-only navigation (Tab/Enter and the
    global vs. focus-owned Space bar), resize mid-rhythm, audio/timing
    integrity, and visual notation inspection. `.laboratory-flow`
    (inactive) sets `pointer-events: none` on itself, but CSS resolves
    pointer-events per element rather than blocking a descendant from
    opting back in, so `.lab-note-target`'s own unconditional
    `pointer-events: auto` kept its buttons hit-testable even while the
    laboratory sat off-screen at `opacity: 0`. Once a visitor opened the
    laboratory once and restarted, those stale hit-targets sat on top of
    later acts' same-position beat-targets and silently swallowed clicks —
    reproduced live via `document.elementFromPoint` resolving to the lab
    button instead of the active act's own control. Fixed by scoping the
    override to `.laboratory-flow-active .lab-note-target` and added
    `spec/laboratory-pointer-events.test.ts` so the CSS can't silently
    regress to the unconditional form. Everything else in the review passed
    clean: the shared exit-to-title handler tears down `AudioContext`/the
    scheduler correctly regardless of which act calls it; mute-toggle and
    resizes don't disturb exhibition/audio state; keyboard-only input
    reaches full parity with mouse/touch; zero console errors across two
    full run-throughs. One gap was flagged, not fixed: the back-nav control
    shows a static "title" label and always performs a full return to the
    title screen, rather than naming the actual destination act and
    restoring its settled state — real back-stack navigation is a larger,
    more product-decision-laden change than this verification milestone's
    scope. pnpm check 241/241 (2 new tests):
    [`2721f00`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Asuka121380/commit/2721f0077e86f7ae1fdb089955bd636fb0a7ca5b).

12. **A final manual review after Milestone 7, on 2026-08-17, found two
    remaining defects a fully green suite still couldn't see.** With
    [`37d08fc`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Asuka121380/commit/37d08fcdf0323ecced48eea712c25fba45bdb00e)
    complete and `pnpm check` and `pnpm check:evidence` both passing, I
    reviewed the exhibition once more against real user screenshots rather
    than treating a green suite as the finish line. Two issues survived:
    - The drum and bass staves were horizontally misaligned in Acts IV-V and
      the laboratory. Code inspection found the bass stave had a bass clef
      but no 4/4 time signature, and --- more fundamentally --- VexFlow's
      own `getNoteStartX()` computation returns different values for the two
      staves even with matching time signatures, because the percussion
      clef's and bass clef's modifier glyphs measure different widths. I
      chose the smallest correction rather than a layout rewrite: add the
      missing time signature, then explicitly force
      `bassStave.setNoteStartX(stave.getNoteStartX())` so both staves share
      one x-grid regardless of how their modifiers happen to measure.
    - I tested the bass through two playback systems: a better speaker, where
      the kick and bass were technically distinguishable but still too
      similar, and the built-in speaker of an ordinary laptop, where telling
      them apart became difficult. Code inspection explained why: the bass
      was documented throughout `EXHIBITION_FLOW.md` as a fixed C3 pitch
      (~130.81 Hz), but `audio-voices.ts` actually synthesized it as a pure
      sine at 82 Hz with essentially the same short envelope shape as the
      kick --- two near-identical low-frequency thumps rather than one
      percussive hit and one pitched, sustained note. I again chose the
      smallest effective change over redesigning the audio system: correct
      the frequency to true C3 (130.8128 Hz), switch the oscillator to
      triangle so it actually carries pitch-defining harmonics, raise the
      lowpass cutoff to 800 Hz so those harmonics survive, and give the bass
      a slightly slower attack and longer decay than the kick so the two
      read as different instruments by envelope shape as well as timbre. The
      kick itself was left untouched.
    Both fixes were covered with regression tests before committing: a
    `vi.spyOn`-based test on `Stave.prototype.setNoteStartX` (jsdom has no
    canvas text metrics, so `getNoteStartX()` collapses to a constant there
    regardless of clef content --- a plain coordinate comparison alone would
    have passed even against the unfixed bug) plus a coordinate-tolerance
    test, and a new `audio-voices.test.ts` asserting the bass's frequency,
    oscillator type, filter, envelope timing, and independence from the
    kick, all verified via `git stash` to genuinely fail against the
    pre-fix code. A real-Chromium pass at both marking viewports across Act
    IV Lock, Act IV Answer, Act V, and the laboratory measured 0px of
    drum/bass notehead offset throughout, including immediately after a
    mid-playback resize, and an instrumented Web Audio graph confirmed the
    kick remains an untouched sine sweep while the bass now fires as an
    independent, stable 130.8128 Hz triangle through an 800Hz lowpass. I
    cannot claim the bass now sounds sufficiently distinct on a poor
    speaker --- that subjective judgement is the user's alone, and this
    entry does not assert it has been given. pnpm check 250/250:
    [`84f52ac`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Asuka121380/commit/84f52acfe9f257792b9d11a7c562cb748bebcffa).

## Before you ship

`pnpm check:evidence` verifies the citations above resolve to real commits,
that `reflections/assignment-1.md` exists, and that `CLAUDE.md` is present.
