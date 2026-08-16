import { describe, expect, it } from "vitest";
import {
  BASIC_KICK_INDICES,
  BEAT_FOUR_INDEX,
  BEAT_ONE_INDEX,
  BEAT_THREE_INDEX,
  OFFBEAT_AFTER_BEAT_TWO_INDEX,
  OFFBEAT_KICK_INDICES,
  SYNCOPATED_KICK_INDICES,
} from "../src/rhythm-model";
import {
  advanceBar,
  canTriggerCompare332,
  canTriggerCompareBasic,
  canTriggerOrchestrate,
  pendingKickIndicesForStep,
  selectTarget,
  selectableTargets,
  startExhibition,
  triggerCompare332,
  triggerCompareBasic,
  triggerFlip,
  triggerOrchestrate,
  type Act3Screen,
  type ExhibitionState,
} from "../src/exhibition-state";
import { annotationForStep } from "../src/annotations";

// Drives all the way from the title screen through Act I and the whole of
// Act II's A/B comparison into Act III's opening annotation-1 — the same
// path a real visitor takes, since Act III has no separate entry point.
function reachAct3(): Act3Screen {
  let state: ExhibitionState = startExhibition();
  state = advanceBar(advanceBar(state)); // Act I: listening -> annotation-1
  state = advanceBar(advanceBar(state)); // annotation-1 -> annotation-2
  state = advanceBar(advanceBar(state)); // annotation-2 -> annotation-3
  state = selectTarget(state, BEAT_ONE_INDEX);
  state = selectTarget(state, BEAT_THREE_INDEX); // -> queued
  state = advanceBar(state); // queued -> Act II, listening
  state = advanceBar(advanceBar(state)); // listening -> annotation-1
  state = advanceBar(state); // annotation-1 -> annotation-2
  state = advanceBar(state); // annotation-2 -> annotation-3
  state = advanceBar(triggerFlip(state)); // annotation-3 -> flip-queued -> backbeat-listening
  state = advanceBar(advanceBar(state)); // backbeat-listening -> annotation-4
  state = advanceBar(state); // annotation-4 -> annotation-5
  state = advanceBar(state); // annotation-5 -> compare-prompt-1
  state = advanceBar(triggerFlip(state)); // compare-prompt-1 -> compare-1-queued -> compare-1-listening
  state = advanceBar(state); // compare-1-listening -> compare-prompt-2
  state = advanceBar(triggerFlip(state)); // compare-prompt-2 -> compare-2-queued -> compare-2-listening
  state = advanceBar(state); // compare-2-listening -> settled
  state = advanceBar(state); // settled -> Act III, annotation-1
  if (state.screen !== "exhibition" || state.act !== "act-3") {
    throw new Error("unreachable");
  }
  return state;
}

describe("exhibition state — Act II to Act III handoff", () => {
  it("lands on Act III's annotation-1 with a fresh bar count", () => {
    const state = reachAct3();
    expect(state.step).toBe("annotation-1");
    expect(state.barsInStep).toBe(0);
  });
});

describe("exhibition state — Act III bar-boundary sequence", () => {
  it("annotation-1 does not advance on bar boundaries alone — it waits on the orchestrate reveal", () => {
    let state: ExhibitionState = reachAct3();
    state = advanceBar(advanceBar(advanceBar(state)));
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("annotation-1");
    expect(canTriggerOrchestrate(state)).toBe(true);
  });

  function reachKitListening(): ExhibitionState {
    return advanceBar(triggerOrchestrate(reachAct3()));
  }

  it("triggering orchestrate queues the full kit for the next barline", () => {
    const queued = triggerOrchestrate(reachAct3());
    if (queued.screen !== "exhibition" || queued.act !== "act-3") throw new Error("unreachable");
    expect(queued.step).toBe("kit-queued");
    // Excluded from pendingKickIndicesForStep on purpose: it's a full
    // pattern swap (createDrumKitPattern), not a kick-index-only change.
    expect(pendingKickIndicesForStep(queued.step)).toBeNull();
  });

  it("the bar boundary after kit-queued lands on kit-listening", () => {
    const state = reachKitListening();
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("kit-listening");
    expect(state.barsInStep).toBe(0);
  });

  it("two bars of kit-listening advance to annotation-2", () => {
    let state = reachKitListening();
    state = advanceBar(advanceBar(state));
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("annotation-2");
  });

  function reachAnnotation3(): ExhibitionState {
    let state = reachKitListening();
    state = advanceBar(advanceBar(state)); // -> annotation-2
    state = advanceBar(state); // -> annotation-2b
    state = advanceBar(state); // -> annotation-3
    return state;
  }

  it("one further bar advances annotation-2 to annotation-2b, then to annotation-3", () => {
    let state = reachKitListening();
    state = advanceBar(advanceBar(state)); // -> annotation-2
    state = advanceBar(state);
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("annotation-2b");

    state = advanceBar(state);
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("annotation-3");
  });

  it("annotation-3 waits on the guided kick move — only the offbeat-after-2 target is selectable", () => {
    const state = reachAnnotation3();
    expect(selectableTargets(state).size).toBe(1);
    expect(selectableTargets(state).has(OFFBEAT_AFTER_BEAT_TWO_INDEX)).toBe(true);

    const advanced = advanceBar(advanceBar(advanceBar(state)));
    if (advanced.screen !== "exhibition") throw new Error("unreachable");
    expect(advanced.step).toBe("annotation-3");
  });

  it("selecting the wrong target during annotation-3 is a no-op", () => {
    const state = reachAnnotation3();
    expect(selectTarget(state, BEAT_FOUR_INDEX)).toEqual(state);
  });

  function reachTempPatternListening(): ExhibitionState {
    return advanceBar(selectTarget(reachAnnotation3(), OFFBEAT_AFTER_BEAT_TWO_INDEX));
  }

  it("selecting the offbeat after beat 2 queues the temporary kick pattern", () => {
    const queued = selectTarget(reachAnnotation3(), OFFBEAT_AFTER_BEAT_TWO_INDEX);
    if (queued.screen !== "exhibition" || queued.act !== "act-3") throw new Error("unreachable");
    expect(queued.step).toBe("move-kick-queued");
    expect(pendingKickIndicesForStep(queued.step)).toEqual(OFFBEAT_KICK_INDICES);
  });

  it("the bar boundary after move-kick-queued lands on temp-pattern-listening", () => {
    const state = reachTempPatternListening();
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("temp-pattern-listening");
    expect(state.barsInStep).toBe(0);
  });

  function reachAnnotation4(): ExhibitionState {
    return advanceBar(advanceBar(reachTempPatternListening()));
  }

  it("two bars of temp-pattern-listening advance to annotation-4", () => {
    const state = reachAnnotation4();
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("annotation-4");
  });

  it("annotation-4 waits on the guided kick move — only beat 4 is selectable", () => {
    const state = reachAnnotation4();
    expect(selectableTargets(state).size).toBe(1);
    expect(selectableTargets(state).has(BEAT_FOUR_INDEX)).toBe(true);

    const advanced = advanceBar(advanceBar(state));
    if (advanced.screen !== "exhibition") throw new Error("unreachable");
    expect(advanced.step).toBe("annotation-4");
  });

  function reachFinalGrooveListening(): ExhibitionState {
    return advanceBar(selectTarget(reachAnnotation4(), BEAT_FOUR_INDEX));
  }

  it("selecting beat 4 queues the finished 3-3-2 kick pattern", () => {
    const queued = selectTarget(reachAnnotation4(), BEAT_FOUR_INDEX);
    if (queued.screen !== "exhibition" || queued.act !== "act-3") throw new Error("unreachable");
    expect(queued.step).toBe("add-beat-4-queued");
    expect(pendingKickIndicesForStep(queued.step)).toEqual(SYNCOPATED_KICK_INDICES);
  });

  it("the bar boundary after add-beat-4-queued lands on final-groove-listening", () => {
    const state = reachFinalGrooveListening();
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("final-groove-listening");
    expect(state.barsInStep).toBe(0);
  });

  function reachComparePrompt1(): ExhibitionState {
    let state = reachFinalGrooveListening();
    state = advanceBar(advanceBar(state)); // -> annotation-5
    state = advanceBar(state); // -> annotation-6
    state = advanceBar(state); // -> annotation-7
    state = advanceBar(state); // -> compare-prompt-1
    return state;
  }

  it("two bars of final-groove-listening, then one bar each, walk through annotation-5/6/7 to compare-prompt-1", () => {
    const state = reachComparePrompt1();
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("compare-prompt-1");
    expect(canTriggerCompareBasic(state)).toBe(true);
  });

  it("compare-prompt-1 does not advance on bar boundaries alone — it waits on triggerCompareBasic", () => {
    let state = reachComparePrompt1();
    state = advanceBar(advanceBar(state));
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("compare-prompt-1");
  });

  function reachCompareBasicListening(): ExhibitionState {
    return advanceBar(triggerCompareBasic(reachComparePrompt1()));
  }

  it("triggering compare-basic queues the basic kick pattern, then lands on compare-basic-listening", () => {
    const queued = triggerCompareBasic(reachComparePrompt1());
    if (queued.screen !== "exhibition" || queued.act !== "act-3") throw new Error("unreachable");
    expect(queued.step).toBe("compare-basic-queued");
    expect(pendingKickIndicesForStep(queued.step)).toEqual(BASIC_KICK_INDICES);

    const state = reachCompareBasicListening();
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("compare-basic-listening");
    expect(state.barsInStep).toBe(0);
  });

  function reachComparePrompt2(): ExhibitionState {
    return advanceBar(reachCompareBasicListening());
  }

  it("one bar of compare-basic-listening advances to compare-prompt-2", () => {
    const state = reachComparePrompt2();
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("compare-prompt-2");
    expect(canTriggerCompare332(state)).toBe(true);
  });

  function reachCompare332Listening(): ExhibitionState {
    return advanceBar(triggerCompare332(reachComparePrompt2()));
  }

  it("triggering compare-332 queues the 3-3-2 kick pattern, then lands on compare-332-listening", () => {
    const queued = triggerCompare332(reachComparePrompt2());
    if (queued.screen !== "exhibition" || queued.act !== "act-3") throw new Error("unreachable");
    expect(queued.step).toBe("compare-332-queued");
    expect(pendingKickIndicesForStep(queued.step)).toEqual(SYNCOPATED_KICK_INDICES);

    const state = reachCompare332Listening();
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("compare-332-listening");
  });

  it("one bar of compare-332-listening settles Act III", () => {
    const state = advanceBar(reachCompare332Listening());
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("settled");
  });

  it("settled hands off directly into Act IV's opening annotation-1", () => {
    const settled = advanceBar(reachCompare332Listening());
    const nextAct = advanceBar(settled);
    if (nextAct.screen !== "exhibition") throw new Error("unreachable");
    expect(nextAct.act).toBe("act-4");
    expect(nextAct.step).toBe("annotation-1");
    expect(nextAct.barsInStep).toBe(0);
  });
});

describe("exhibition state — Act III guarded controls", () => {
  it("canTriggerOrchestrate/canTriggerCompareBasic/canTriggerCompare332 are false outside their own step", () => {
    const state = reachAct3();
    expect(canTriggerCompareBasic(state)).toBe(false);
    expect(canTriggerCompare332(state)).toBe(false);
    expect(triggerCompareBasic(state)).toEqual(state);
    expect(triggerCompare332(state)).toEqual(state);
  });

  it("triggerOrchestrate is a no-op once already past annotation-1", () => {
    const state = advanceBar(triggerOrchestrate(reachAct3())); // kit-listening
    expect(canTriggerOrchestrate(state)).toBe(false);
    expect(triggerOrchestrate(state)).toEqual(state);
  });

  it("do nothing on the title screen or during Act I/Act II", () => {
    expect(canTriggerOrchestrate({ screen: "title" })).toBe(false);
    expect(canTriggerOrchestrate(startExhibition())).toBe(false);
    expect(canTriggerCompareBasic({ screen: "title" })).toBe(false);
    expect(canTriggerCompare332({ screen: "title" })).toBe(false);
  });
});

describe("exhibition state — Act III selectTarget stays scoped to its own guided steps", () => {
  it("selectTarget is a no-op during kit-listening", () => {
    const state = advanceBar(triggerOrchestrate(reachAct3()));
    expect(selectTarget(state, OFFBEAT_AFTER_BEAT_TWO_INDEX)).toEqual(state);
    expect(selectableTargets(state).size).toBe(0);
  });
});

describe("annotations — Act III", () => {
  it("shows annotation-1 upper-left with an unlabeled bracket over the whole voice", () => {
    const annotation = annotationForStep(reachAct3());
    expect(annotation?.id).toBe("act3-annotation-1");
    expect(annotation?.position).toBe("upper-left");
    expect(annotation?.groupBraces).toEqual([{ startIndex: BEAT_ONE_INDEX, endIndex: 7 }]);
  });

  it("reuses 'next bar…' for every queued step", () => {
    const queued = triggerOrchestrate(reachAct3());
    const annotation = annotationForStep(queued);
    expect(annotation?.id).toBe("next-bar");
    expect(annotation?.lines).toEqual(["next bar…"]);
  });

  it("shows annotation-2 with the three offset voice-role lines", () => {
    let state: ExhibitionState = advanceBar(triggerOrchestrate(reachAct3()));
    state = advanceBar(advanceBar(state)); // kit-listening -> annotation-2
    const annotation = annotationForStep(state);
    expect(annotation?.id).toBe("act3-annotation-2");
    expect(annotation?.lines).toEqual([
      "The hi-hat keeps time.",
      "The snare carries the backbeat.",
      "The kick grounds 1 and 3.",
    ]);
    expect(annotation?.offsetLines).toBe(true);
  });

  it("shows annotation-3 with an arrow and arc from beat 3 to the offbeat after beat 2", () => {
    let state: ExhibitionState = advanceBar(triggerOrchestrate(reachAct3()));
    state = advanceBar(advanceBar(state)); // -> annotation-2
    state = advanceBar(state); // -> annotation-2b
    state = advanceBar(state); // -> annotation-3
    const annotation = annotationForStep(state);
    expect(annotation?.id).toBe("act3-annotation-3");
    expect(annotation?.arrowTargets).toEqual([OFFBEAT_AFTER_BEAT_TWO_INDEX]);
    expect(annotation?.arcs).toEqual([
      { from: BEAT_THREE_INDEX, to: OFFBEAT_AFTER_BEAT_TWO_INDEX },
    ]);
  });

  it("shows annotation-4 with an arrow to beat 4", () => {
    let state: ExhibitionState = advanceBar(triggerOrchestrate(reachAct3()));
    state = advanceBar(advanceBar(state)); // -> annotation-2
    state = advanceBar(state); // -> annotation-2b
    state = advanceBar(state); // -> annotation-3
    state = advanceBar(selectTarget(state, OFFBEAT_AFTER_BEAT_TWO_INDEX)); // -> temp-pattern-listening
    state = advanceBar(advanceBar(state)); // -> annotation-4
    const annotation = annotationForStep(state);
    expect(annotation?.id).toBe("act3-annotation-4");
    expect(annotation?.arrowTargets).toEqual([BEAT_FOUR_INDEX]);
  });

  it("shows annotation-5 with three labelled 3-3-2 braces", () => {
    let state: ExhibitionState = advanceBar(triggerOrchestrate(reachAct3()));
    state = advanceBar(advanceBar(state));
    state = advanceBar(state);
    state = advanceBar(state);
    state = advanceBar(selectTarget(state, OFFBEAT_AFTER_BEAT_TWO_INDEX));
    state = advanceBar(advanceBar(state));
    state = advanceBar(selectTarget(state, BEAT_FOUR_INDEX)); // -> final-groove-listening
    state = advanceBar(advanceBar(state)); // -> annotation-5
    const annotation = annotationForStep(state);
    expect(annotation?.id).toBe("act3-annotation-5");
    expect(annotation?.lines).toEqual(["Three.", "Three.", "Two."]);
    expect(annotation?.groupBraces?.length).toBe(3);
    expect(annotation?.groupBraces?.map((brace) => brace.label)).toEqual(["3", "3", "2"]);
  });
});
