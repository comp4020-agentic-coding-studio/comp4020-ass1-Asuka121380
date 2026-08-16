# Process overview

## What I built

*Where the Beat Leans* is a five-act interactive music exhibition showing how
groove emerges from accent, rhythm and the relationship between drums and bass.
It moves from an equal eight-note pulse through accent reversal, a 3-3-2 drum
pattern, bass-and-kick locking and call-and-response, then gives the visitor
control in a free-play laboratory. VexFlow engraves the notation, while Web
Audio synthesizes the instruments and schedules changes at bar boundaries.

## The moments that mattered

1. **A green test suite was not enough to accept the first act.** After Title +
   Act I passed its automated checks, I opened it in a real browser and found
   that it worked but still felt wrong: the title looked typeset, the playhead
   trailed the sound, accents lacked contrast and annotations appeared too
   abruptly. The obvious response was to call these superficial polish after
   the implementation had passed. Instead, I treated the rendered and audible
   experience as another source of truth, correcting the typography,
   audio-visual synchronization, dynamics and annotation pacing. Reviewing the
   result at both marking viewports, rather than relying on another green run,
   was how I knew it was ready:
   [`7cafec3...89a6c0a`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Asuka121380/compare/7cafec35c4fc4f0b2c0cada483c768be26b42c12...89a6c0ad57ddfe4b9a1481d8af54ca4a89152f6c).

2. **I turned the approved first act into a design system before building the
   rest.** Rather than allowing every later act to develop its own layout and
   interaction conventions, I recorded Act I's manuscript palette, Caveat
   typography, handwritten controls, crossfades, navigation and responsive
   behaviour in `CLAUDE.md` as constraints. Later scenes could introduce a drum
   kit, bass stave and new interactions while reusing the same surrounding
   system. This upfront direction reduced potential redesign and made visual
   consistency testable. Browser checks at both viewports confirmed that the
   completed scenes still read as one exhibition:
   [`af83c41`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Asuka121380/commit/af83c415e93c63503c6dbdaabf3981023e5bc35c).

3. **The bass exposed something the agent's tests could not hear.** Automated
   checks proved that bass and kick used separate audio nodes, yet through a
   MacBook speaker I could barely distinguish them. Inspection showed that the
   bass was an 82 Hz sine with an envelope too similar to the kick: structurally
   separate, but perceptually another low thump. Instead of replacing the audio
   system, I made a minimal musical correction: true C3 at 130.8128 Hz, a
   triangle wave, an 800 Hz lowpass and a longer envelope. Regression tests
   verified the audio graph; listening to the refreshed build on both the
   laptop and an external speaker established that the perceptual problem was
   resolved:
   [`84f52ac`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Asuka121380/commit/84f52acfe9f257792b9d11a7c562cb748bebcffa).

4. **Finishing also meant deciding what not to retrofit.** The exhibition still
   follows its intended sequence, and the handwritten back control returns to
   the title instead of restoring the previous act or providing arbitrary act
   selection. After the full state machine and audio lifecycle existed, a real
   back stack would have required redesigning scene restoration and scheduler
   ownership rather than applying a safe local fix. I documented the limitation
   instead of disguising a large late change as polish. The complete journey,
   restart cycle and keyboard interaction remained reliable, so I accepted the
   scoped behaviour while taking forward the architectural lesson: if
   non-linear navigation matters, it must be designed into the state model at
   the beginning:
   [`2721f00`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Asuka121380/commit/2721f0077e86f7ae1fdb089955bd636fb0a7ca5b).
