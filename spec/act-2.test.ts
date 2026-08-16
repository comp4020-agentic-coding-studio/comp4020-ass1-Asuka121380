import { describe, expect, it } from "vitest";
import { BEAT_ONE_INDEX, BEAT_THREE_INDEX } from "../src/rhythm-model";
import {
  ACT1_TARGETS,
  ACT2_BACKBEAT_TARGETS,
  advanceBar,
  canFlipAccents,
  isFlipControlVisible,
  pendingAccentTargetsForStep,
  selectTarget,
  selectableTargets,
  startExhibition,
  triggerFlip,
  type Act2Screen,
  type ExhibitionState,
} from "../src/exhibition-state";
import { annotationForStep } from "../src/annotations";

// Drives from the title screen all the way through Act I's exit condition
// (EXHIBITION_FLOW.md section 6) into Act II's opening "listening" step —
// the same path a real visitor takes, since Act II has no separate entry
// point of its own.
function reachAct2(): Act2Screen {
  let state: ExhibitionState = startExhibition();
  state = advanceBar(advanceBar(state)); // listening -> annotation-1
  state = advanceBar(advanceBar(state)); // annotation-1 -> annotation-2
  state = advanceBar(advanceBar(state)); // annotation-2 -> annotation-3
  state = selectTarget(state, BEAT_ONE_INDEX);
  state = selectTarget(state, BEAT_THREE_INDEX); // -> queued
  state = advanceBar(state); // queued -> Act II, listening
  if (state.screen !== "exhibition" || state.act !== "act-2") {
    throw new Error("unreachable");
  }
  return state;
}

describe("exhibition state — Act I to Act II handoff", () => {
  it("lands on Act II's listening step with a fresh bar count", () => {
    const state = reachAct2();
    expect(state.step).toBe("listening");
    expect(state.barsInStep).toBe(0);
  });
});

describe("exhibition state — Act II bar-boundary sequence", () => {
  it("two bars of listening advance to annotation-1", () => {
    let state: ExhibitionState = reachAct2();
    state = advanceBar(advanceBar(state));
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("annotation-1");
  });

  it("one further bar advances annotation-1 to annotation-2", () => {
    let state: ExhibitionState = reachAct2();
    state = advanceBar(advanceBar(state));
    state = advanceBar(state);
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("annotation-2");
  });

  it("one further bar advances annotation-2 to annotation-3, where the flip becomes available", () => {
    let state: ExhibitionState = reachAct2();
    state = advanceBar(advanceBar(state));
    state = advanceBar(state);
    state = advanceBar(state);
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("annotation-3");
    expect(canFlipAccents(state)).toBe(true);
  });

  function reachAnnotation3(): ExhibitionState {
    let state: ExhibitionState = reachAct2();
    state = advanceBar(advanceBar(state));
    state = advanceBar(state);
    state = advanceBar(state);
    return state;
  }

  it("annotation-3 does not advance on bar boundaries alone — it waits on the flip", () => {
    let state = reachAnnotation3();
    state = advanceBar(advanceBar(advanceBar(state)));
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("annotation-3");
  });

  it("the first flip queues the backbeat pattern for the next barline", () => {
    const state = triggerFlip(reachAnnotation3());
    if (state.screen !== "exhibition" || state.act !== "act-2") throw new Error("unreachable");
    expect(state.step).toBe("flip-queued");
    expect(pendingAccentTargetsForStep(state.step)).toEqual(ACT2_BACKBEAT_TARGETS);
  });

  function reachBackbeatListening(): ExhibitionState {
    return advanceBar(triggerFlip(reachAnnotation3()));
  }

  it("the bar boundary after flip-queued lands on backbeat-listening", () => {
    const state = reachBackbeatListening();
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("backbeat-listening");
    expect(state.barsInStep).toBe(0);
  });

  it("two bars of backbeat-listening advance to annotation-4", () => {
    let state = reachBackbeatListening();
    state = advanceBar(advanceBar(state));
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("annotation-4");
  });

  function reachAnnotation5(): ExhibitionState {
    let state = reachBackbeatListening();
    state = advanceBar(advanceBar(state)); // -> annotation-4
    state = advanceBar(state); // -> annotation-5
    return state;
  }

  it("one further bar advances annotation-4 to annotation-5", () => {
    const state = reachAnnotation5();
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("annotation-5");
  });

  function reachComparePrompt1(): ExhibitionState {
    return advanceBar(reachAnnotation5());
  }

  it("one further bar advances annotation-5 to the first comparison prompt", () => {
    const state = reachComparePrompt1();
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("compare-prompt-1");
    expect(canFlipAccents(state)).toBe(true);
  });

  function reachCompare1Listening(): ExhibitionState {
    return advanceBar(triggerFlip(reachComparePrompt1()));
  }

  it("flipping at the first comparison prompt queues the 1/3 pattern, then lands on compare-1-listening", () => {
    const queued = triggerFlip(reachComparePrompt1());
    if (queued.screen !== "exhibition" || queued.act !== "act-2") throw new Error("unreachable");
    expect(pendingAccentTargetsForStep(queued.step)).toEqual(ACT1_TARGETS);

    const state = reachCompare1Listening();
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("compare-1-listening");
  });

  function reachComparePrompt2(): ExhibitionState {
    return advanceBar(reachCompare1Listening());
  }

  it("one full bar of compare-1-listening advances to the second comparison prompt", () => {
    const state = reachComparePrompt2();
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("compare-prompt-2");
    expect(canFlipAccents(state)).toBe(true);
  });

  function reachCompare2Listening(): ExhibitionState {
    return advanceBar(triggerFlip(reachComparePrompt2()));
  }

  it("flipping at the second comparison prompt queues the 2/4 pattern, then lands on compare-2-listening", () => {
    const queued = triggerFlip(reachComparePrompt2());
    if (queued.screen !== "exhibition" || queued.act !== "act-2") throw new Error("unreachable");
    expect(pendingAccentTargetsForStep(queued.step)).toEqual(ACT2_BACKBEAT_TARGETS);

    const state = reachCompare2Listening();
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("compare-2-listening");
  });

  it("one full bar of compare-2-listening settles Act II and hides the flip control", () => {
    const state = advanceBar(reachCompare2Listening());
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("settled");
    expect(canFlipAccents(state)).toBe(false);
    expect(isFlipControlVisible(state)).toBe(false);
  });
});

describe("exhibition state — flip control visibility", () => {
  it("stays hidden through listening, annotation-1, and annotation-2", () => {
    let state: ExhibitionState = reachAct2();
    expect(isFlipControlVisible(state)).toBe(false);
    state = advanceBar(advanceBar(state));
    expect(isFlipControlVisible(state)).toBe(false);
    state = advanceBar(state);
    expect(isFlipControlVisible(state)).toBe(false);
  });

  it("becomes visible at annotation-3 and stays visible through the whole A/B comparison", () => {
    let state: ExhibitionState = reachAct2();
    state = advanceBar(advanceBar(state)); // annotation-1
    state = advanceBar(state); // annotation-2
    state = advanceBar(state); // annotation-3
    expect(isFlipControlVisible(state)).toBe(true);

    state = advanceBar(triggerFlip(state)); // backbeat-listening
    expect(isFlipControlVisible(state)).toBe(true);

    state = advanceBar(advanceBar(state)); // annotation-4
    expect(isFlipControlVisible(state)).toBe(true);

    state = advanceBar(state); // annotation-5
    expect(isFlipControlVisible(state)).toBe(true);

    state = advanceBar(state); // compare-prompt-1
    expect(isFlipControlVisible(state)).toBe(true);

    state = advanceBar(triggerFlip(state)); // compare-1-listening
    expect(isFlipControlVisible(state)).toBe(true);

    state = advanceBar(state); // compare-prompt-2
    expect(isFlipControlVisible(state)).toBe(true);

    state = advanceBar(triggerFlip(state)); // compare-2-listening
    expect(isFlipControlVisible(state)).toBe(true);
  });

  it("is false on the title screen and throughout Act I", () => {
    expect(isFlipControlVisible({ screen: "title" })).toBe(false);
    expect(isFlipControlVisible(startExhibition())).toBe(false);
  });
});

describe("exhibition state — flip guard", () => {
  it("cannot be triggered outside the three flippable steps", () => {
    const state = reachAct2();
    expect(canFlipAccents(state)).toBe(false);
    expect(triggerFlip(state)).toEqual(state);
  });

  it("does nothing on the title screen or during Act I", () => {
    expect(canFlipAccents({ screen: "title" })).toBe(false);
    expect(canFlipAccents(startExhibition())).toBe(false);
  });
});

describe("exhibition state — Act I tap-to-accent targets stay Act-I-only", () => {
  it("selectableTargets is empty during Act II's own annotation-3, despite the shared step name", () => {
    let state: ExhibitionState = reachAct2();
    state = advanceBar(advanceBar(state));
    state = advanceBar(state);
    state = advanceBar(state);
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("annotation-3");
    expect(selectableTargets(state).size).toBe(0);
  });

  it("selectTarget is a no-op during Act II", () => {
    let state: ExhibitionState = reachAct2();
    state = advanceBar(advanceBar(state));
    state = advanceBar(state);
    state = advanceBar(state);
    const after = selectTarget(state, BEAT_ONE_INDEX);
    expect(after).toEqual(state);
  });
});

describe("annotations — Act II", () => {
  it("shows no annotation on Act II's initial listening step", () => {
    expect(annotationForStep(reachAct2())).toBeNull();
  });

  it("shows annotation 1 upper-left with arrows to beats 1 and 3", () => {
    let state: ExhibitionState = reachAct2();
    state = advanceBar(advanceBar(state));
    const annotation = annotationForStep(state);
    expect(annotation?.id).toBe("act2-annotation-1");
    expect(annotation?.position).toBe("upper-left");
    expect(annotation?.arrowTargets).toEqual([BEAT_ONE_INDEX, BEAT_THREE_INDEX]);
  });

  it("shows annotation 2 lower-right with its three words offset", () => {
    let state: ExhibitionState = reachAct2();
    state = advanceBar(advanceBar(state));
    state = advanceBar(state);
    const annotation = annotationForStep(state);
    expect(annotation?.id).toBe("act2-annotation-2");
    expect(annotation?.position).toBe("lower-right");
    expect(annotation?.lines).toEqual(["Solid.", "Square.", "Grounded."]);
    expect(annotation?.offsetLines).toBe(true);
  });

  it("shows annotation 3 upper-right, the inversion prompt", () => {
    let state: ExhibitionState = reachAct2();
    state = advanceBar(advanceBar(state));
    state = advanceBar(state);
    state = advanceBar(state);
    const annotation = annotationForStep(state);
    expect(annotation?.id).toBe("act2-annotation-3");
    expect(annotation?.position).toBe("upper-right");
  });

  it("reuses 'next bar…' for every queued step", () => {
    let state: ExhibitionState = reachAct2();
    state = advanceBar(advanceBar(state));
    state = advanceBar(state);
    state = advanceBar(state);
    state = triggerFlip(state);
    const annotation = annotationForStep(state);
    expect(annotation?.id).toBe("next-bar");
    expect(annotation?.lines).toEqual(["next bar…"]);
  });

  it("shows annotation 5 upper-right with a smaller supporting second line", () => {
    let state: ExhibitionState = reachAct2();
    state = advanceBar(advanceBar(state)); // annotation-1
    state = advanceBar(state); // annotation-2
    state = advanceBar(state); // annotation-3
    state = advanceBar(triggerFlip(state)); // backbeat-listening
    state = advanceBar(advanceBar(state)); // annotation-4
    state = advanceBar(state); // annotation-5
    const annotation = annotationForStep(state);
    expect(annotation?.id).toBe("act2-annotation-5");
    expect(annotation?.position).toBe("upper-right");
    expect(annotation?.smallLineIndex).toBe(1);
    expect(annotation?.arrowTargets).toBeDefined();
  });
});
