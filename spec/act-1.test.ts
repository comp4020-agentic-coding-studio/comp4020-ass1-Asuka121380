import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import {
  BEAT_ONE_INDEX,
  BEAT_THREE_INDEX,
  activeInstruments,
  allVelocitiesEqual,
  applyPendingPattern,
  createEmptyStavePattern,
  createInitialRhythmState,
  createPulsePattern,
  queuePendingPattern,
  withAccentsAt,
} from "../src/rhythm-model";
import {
  ACT1_TARGETS,
  advanceBar,
  selectTarget,
  selectableTargets,
  startExhibition,
} from "../src/exhibition-state";
import { annotationForStep } from "../src/annotations";
import {
  isBarStart,
  nextSlotIndex,
  secondsPerEighthNote,
} from "../src/scheduler-math";

describe("rhythm model", () => {
  it("the initial pattern contains exactly eight events in one 4/4 bar", () => {
    const pattern = createPulsePattern();
    expect(pattern.voices[0].slots.length).toBe(8);
    expect(pattern.beatsPerBar).toBe(4);
    expect(pattern.beatUnit).toBe(4);
  });

  it("all eight initial velocities are equal", () => {
    expect(allVelocitiesEqual(createPulsePattern())).toBe(true);
  });

  it("Act I exposes only the practice-pad instrument", () => {
    expect(activeInstruments(createPulsePattern())).toEqual(["practice-pad"]);
  });

  it("accenting beats 1 and 3 leaves the other six slots' velocity unchanged", () => {
    const base = createPulsePattern();
    const accented = withAccentsAt(base, [BEAT_ONE_INDEX, BEAT_THREE_INDEX]);
    const baseSlots = base.voices[0].slots;
    const accentedSlots = accented.voices[0].slots;
    accentedSlots.forEach((slot, index) => {
      if (index === BEAT_ONE_INDEX || index === BEAT_THREE_INDEX) {
        expect(slot.accent).toBe(true);
        expect(slot.velocity).toBeGreaterThan(baseSlots[index].velocity);
      } else {
        expect(slot.accent).toBe(false);
        expect(slot.velocity).toBe(baseSlots[index].velocity);
      }
    });
  });

  it("queuing a pattern sets pendingPattern without mutating currentPattern", () => {
    const state = createInitialRhythmState();
    const accented = withAccentsAt(state.currentPattern, [
      BEAT_ONE_INDEX,
      BEAT_THREE_INDEX,
    ]);
    const queued = queuePendingPattern(state, accented);
    expect(queued.currentPattern).toBe(state.currentPattern);
    expect(queued.pendingPattern).toBe(accented);
  });

  it("applying a pending pattern swaps it into currentPattern and clears pendingPattern", () => {
    const state = createInitialRhythmState();
    const accented = withAccentsAt(state.currentPattern, [
      BEAT_ONE_INDEX,
      BEAT_THREE_INDEX,
    ]);
    const queued = queuePendingPattern(state, accented);
    const applied = applyPendingPattern(queued);
    expect(applied.currentPattern).toBe(accented);
    expect(applied.pendingPattern).toBeNull();
  });

  it("applying with no pending pattern leaves the state unchanged", () => {
    const state = createInitialRhythmState();
    expect(applyPendingPattern(state)).toEqual(state);
  });

  it("the title screen's empty stave pattern has no slots to notate", () => {
    const pattern = createEmptyStavePattern();
    expect(pattern.voices[0].slots.length).toBe(0);
  });
});

describe("exhibition state — Act I", () => {
  it("starting the exhibition enters the listening step with zero bars completed", () => {
    const state = startExhibition();
    expect(state.screen).toBe("exhibition");
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.act).toBe("act-1");
    expect(state.step).toBe("listening");
    expect(state.barsInStep).toBe(0);
  });

  it("no targets are selectable before annotation-3", () => {
    let state = startExhibition();
    expect(selectableTargets(state).size).toBe(0);
    state = advanceBar(state);
    expect(selectableTargets(state).size).toBe(0);
  });

  it("two completed bars in listening advance to annotation-1", () => {
    let state = startExhibition();
    state = advanceBar(state);
    state = advanceBar(state);
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("annotation-1");
  });

  it("one bar into annotation-1 is not yet enough to advance", () => {
    let state = startExhibition();
    state = advanceBar(advanceBar(state));
    state = advanceBar(state);
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("annotation-1");
  });

  it("two further bars advance annotation-1 to annotation-2", () => {
    let state = startExhibition();
    state = advanceBar(advanceBar(state));
    state = advanceBar(advanceBar(state));
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("annotation-2");
  });

  it("two further bars advance annotation-2 to annotation-3, where beats 1 and 3 become selectable", () => {
    let state = startExhibition();
    state = advanceBar(advanceBar(state));
    state = advanceBar(advanceBar(state));
    state = advanceBar(advanceBar(state));
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("annotation-3");
    expect(selectableTargets(state)).toEqual(new Set(ACT1_TARGETS));
  });

  function reachAnnotation3() {
    let state = startExhibition();
    state = advanceBar(advanceBar(state));
    state = advanceBar(advanceBar(state));
    state = advanceBar(advanceBar(state));
    return state;
  }

  it("selecting only beat 1 during annotation-3 does not complete the act", () => {
    let state = reachAnnotation3();
    state = selectTarget(state, BEAT_ONE_INDEX);
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("annotation-3");
  });

  it("selecting only beat 3 during annotation-3 does not complete the act", () => {
    let state = reachAnnotation3();
    state = selectTarget(state, BEAT_THREE_INDEX);
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("annotation-3");
  });

  it("selecting beats 1 and 3 moves the exhibition to the queued step", () => {
    let state = reachAnnotation3();
    state = selectTarget(state, BEAT_ONE_INDEX);
    state = selectTarget(state, BEAT_THREE_INDEX);
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("queued");
  });

  it("a bar boundary while queued moves the exhibition to settled", () => {
    let state = reachAnnotation3();
    state = selectTarget(state, BEAT_ONE_INDEX);
    state = selectTarget(state, BEAT_THREE_INDEX);
    state = advanceBar(state);
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("settled");
  });

  it("selecting a target outside annotation-3 has no effect", () => {
    const state = startExhibition();
    const after = selectTarget(state, BEAT_ONE_INDEX);
    expect(after).toEqual(state);
  });
});

describe("annotations — Act I", () => {
  it("shows no annotation on the title screen or while listening", () => {
    expect(annotationForStep({ screen: "title" })).toBeNull();
    expect(annotationForStep(startExhibition())).toBeNull();
  });

  it("shows annotation 1 upper-left after two bars of listening", () => {
    const state = advanceBar(advanceBar(startExhibition()));
    const annotation = annotationForStep(state);
    expect(annotation?.id).toBe("annotation-1");
    expect(annotation?.position).toBe("upper-left");
  });

  it("shows annotation 2 upper-right with 'flat' underlined", () => {
    let state = startExhibition();
    state = advanceBar(advanceBar(state));
    state = advanceBar(advanceBar(state));
    const annotation = annotationForStep(state);
    expect(annotation?.id).toBe("annotation-2");
    expect(annotation?.position).toBe("upper-right");
    expect(annotation?.underlineWord).toBe("flat");
  });

  it("shows annotation 3 lower-left with arrows to beats 1 and 3", () => {
    let state = startExhibition();
    state = advanceBar(advanceBar(state));
    state = advanceBar(advanceBar(state));
    state = advanceBar(advanceBar(state));
    const annotation = annotationForStep(state);
    expect(annotation?.id).toBe("annotation-3");
    expect(annotation?.position).toBe("lower-left");
    expect(annotation?.arrowTargets).toEqual([BEAT_ONE_INDEX, BEAT_THREE_INDEX]);
  });

  it("shows 'next bar…' once both targets are selected", () => {
    let state = startExhibition();
    state = advanceBar(advanceBar(state));
    state = advanceBar(advanceBar(state));
    state = advanceBar(advanceBar(state));
    state = selectTarget(state, BEAT_ONE_INDEX);
    state = selectTarget(state, BEAT_THREE_INDEX);
    const annotation = annotationForStep(state);
    expect(annotation?.id).toBe("next-bar");
    expect(annotation?.lines).toEqual(["next bar…"]);
  });

  it("shows no annotation once Act I has settled", () => {
    let state = startExhibition();
    state = advanceBar(advanceBar(state));
    state = advanceBar(advanceBar(state));
    state = advanceBar(advanceBar(state));
    state = selectTarget(state, BEAT_ONE_INDEX);
    state = selectTarget(state, BEAT_THREE_INDEX);
    state = advanceBar(state);
    expect(annotationForStep(state)).toBeNull();
  });
});

describe("scheduler math", () => {
  it("computes seconds per eighth note at 96 BPM", () => {
    // 60s / 96 beats = 0.625s per quarter note; an eighth note is half that.
    expect(secondsPerEighthNote(96)).toBeCloseTo(0.3125, 5);
  });

  it("wraps the eighth-note index from 7 back to 0", () => {
    expect(nextSlotIndex(7)).toBe(0);
    expect(nextSlotIndex(3)).toBe(4);
  });

  it("flags index 0, and only index 0, as a bar boundary", () => {
    expect(isBarStart(0)).toBe(true);
    for (let i = 1; i < 8; i++) expect(isBarStart(i)).toBe(false);
  });
});

describe("built page — title and Act I contract", () => {
  const distPath = resolve("dist/index.html");
  const NEXT_STEP =
    "Build src/title-screen.ts and index.html's title/exhibition markup — see EXHIBITION_FLOW.md sections 5-6.";

  it("built the site", () => {
    expect(existsSync(distPath), `${distPath} not found. ${NEXT_STEP}`).toBe(
      true,
    );
  });

  const doc = existsSync(distPath)
    ? new JSDOM(readFileSync(distPath, "utf8")).window.document
    : undefined;

  it("the title screen exposes a start control with an accessible name", () => {
    expect(doc, NEXT_STEP).toBeTruthy();
    const start = doc!.querySelector<HTMLButtonElement>(
      '[data-testid="start-button"]',
    );
    expect(start, NEXT_STEP).toBeTruthy();
    // The start surface is now a transparent full-screen hit-area with no
    // visible text — its accessible name comes from aria-label instead.
    const hasName =
      !!start!.getAttribute("aria-label")?.trim() || !!start!.textContent?.trim();
    expect(hasName).toBe(true);
  });

  it("the play/pause control has an accessible name", () => {
    expect(doc, NEXT_STEP).toBeTruthy();
    const playPause = doc!.querySelector('[data-testid="play-pause"]');
    expect(playPause, NEXT_STEP).toBeTruthy();
    const hasName =
      !!playPause!.getAttribute("aria-label")?.trim() ||
      !!playPause!.textContent?.trim();
    expect(hasName).toBe(true);
  });

  it("the start-over control has an accessible name", () => {
    expect(doc, NEXT_STEP).toBeTruthy();
    const startOver = doc!.querySelector('[data-testid="start-over"]');
    expect(startOver, NEXT_STEP).toBeTruthy();
    const hasName =
      !!startOver!.getAttribute("aria-label")?.trim() ||
      !!startOver!.textContent?.trim();
    expect(hasName).toBe(true);
  });

  it("the back-navigation control has an accessible name and starts hidden", () => {
    expect(doc, NEXT_STEP).toBeTruthy();
    const backNav = doc!.querySelector('[data-testid="back-nav"]');
    expect(backNav, NEXT_STEP).toBeTruthy();
    const hasName =
      !!backNav!.getAttribute("aria-label")?.trim() ||
      !!backNav!.textContent?.trim();
    expect(hasName).toBe(true);
    // Never visible on the title screen itself — only after activation.
    expect(backNav!.hasAttribute("hidden")).toBe(true);
  });

  it("the beat-labels overlay exists and is hidden from assistive tech", () => {
    expect(doc, NEXT_STEP).toBeTruthy();
    const beatLabels = doc!.querySelector('[data-testid="beat-labels"]');
    expect(beatLabels, NEXT_STEP).toBeTruthy();
    expect(beatLabels!.getAttribute("aria-hidden")).toBe("true");
  });

  it("no element in the built markup carries an autoplay attribute", () => {
    expect(doc, NEXT_STEP).toBeTruthy();
    expect(doc!.querySelectorAll("[autoplay]").length).toBe(0);
  });

  it("retains the invariant single h1, nav landmark, lang, and viewport meta", () => {
    expect(doc, NEXT_STEP).toBeTruthy();
    expect(doc!.documentElement.getAttribute("lang")).toBeTruthy();
    expect(doc!.querySelector('meta[name="viewport"]')).toBeTruthy();
    expect(doc!.querySelector("nav")).toBeTruthy();
    expect(doc!.querySelectorAll("h1").length).toBe(1);
  });
});
