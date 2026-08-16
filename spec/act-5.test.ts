import { describe, expect, it } from "vitest";
import {
  BEAT_FOUR_INDEX,
  BEAT_ONE_INDEX,
  BEAT_THREE_INDEX,
  OFFBEAT_AFTER_BEAT_FOUR_INDEX,
  OFFBEAT_AFTER_BEAT_THREE_INDEX,
  OFFBEAT_AFTER_BEAT_TWO_INDEX,
  POCKET_FINAL_BASS_INDICES,
  POCKET_FINAL_KICK_INDICES,
  POCKET_SHIFTED_LOW_INDICES,
} from "../src/rhythm-model";
import {
  advanceBar,
  canTriggerFullPerformance,
  pendingAct5BassIndicesForStep,
  pendingAct5KickIndicesForStep,
  selectTarget,
  startExhibition,
  triggerBringInBass,
  triggerCompare332,
  triggerCompareAnswer,
  triggerCompareBasic,
  triggerCompareLock,
  triggerFlip,
  triggerFullPerformance,
  triggerOrchestrate,
  triggerShiftBass,
  type Act5Screen,
  type ExhibitionState,
} from "../src/exhibition-state";
import { annotationForStep } from "../src/annotations";

// Drives all the way from the title screen through Acts I-IV into Act V's
// opening entry-listening — the same path a real visitor takes, since Act V
// has no separate entry point and begins directly from Act IV's Lock mode.
function reachAct5(): Act5Screen {
  let state: ExhibitionState = startExhibition();
  // Act I
  state = advanceBar(advanceBar(state)); // listening -> annotation-1
  state = advanceBar(advanceBar(state)); // annotation-1 -> annotation-2
  state = advanceBar(advanceBar(state)); // annotation-2 -> annotation-3
  state = selectTarget(state, BEAT_ONE_INDEX);
  state = selectTarget(state, BEAT_THREE_INDEX); // -> queued
  state = advanceBar(state); // queued -> Act II, listening
  // Act II
  state = advanceBar(advanceBar(state)); // listening -> annotation-1
  state = advanceBar(state); // annotation-1 -> annotation-2
  state = advanceBar(state); // annotation-2 -> annotation-3
  state = advanceBar(triggerFlip(state)); // annotation-3 -> flip-queued -> backbeat-listening
  state = advanceBar(advanceBar(state)); // backbeat-listening -> annotation-4
  state = advanceBar(state); // annotation-4 -> annotation-5
  state = advanceBar(state); // annotation-5 -> compare-prompt-1
  state = advanceBar(triggerFlip(state)); // -> compare-1-queued -> compare-1-listening
  state = advanceBar(state); // -> compare-prompt-2
  state = advanceBar(triggerFlip(state)); // -> compare-2-queued -> compare-2-listening
  state = advanceBar(state); // -> settled
  state = advanceBar(state); // settled -> Act III, annotation-1
  // Act III
  state = advanceBar(triggerOrchestrate(state)); // -> kit-queued -> kit-listening
  state = advanceBar(advanceBar(state)); // kit-listening -> annotation-2
  state = advanceBar(state); // annotation-2 -> annotation-2b
  state = advanceBar(state); // annotation-2b -> annotation-3
  state = advanceBar(selectTarget(state, OFFBEAT_AFTER_BEAT_TWO_INDEX)); // -> move-kick-queued -> temp-pattern-listening
  state = advanceBar(advanceBar(state)); // temp-pattern-listening -> annotation-4
  state = advanceBar(selectTarget(state, BEAT_FOUR_INDEX)); // -> add-beat-4-queued -> final-groove-listening
  state = advanceBar(advanceBar(state)); // final-groove-listening -> annotation-5
  state = advanceBar(state); // annotation-5 -> annotation-6
  state = advanceBar(state); // annotation-6 -> annotation-7
  state = advanceBar(state); // annotation-7 -> compare-prompt-1
  state = advanceBar(triggerCompareBasic(state)); // -> compare-basic-queued -> compare-basic-listening
  state = advanceBar(state); // -> compare-prompt-2
  state = advanceBar(triggerCompare332(state)); // -> compare-332-queued -> compare-332-listening
  state = advanceBar(state); // -> settled
  state = advanceBar(state); // settled -> Act IV, annotation-1
  // Act IV
  state = advanceBar(triggerBringInBass(state)); // -> bass-queued -> lock-listening
  state = advanceBar(advanceBar(state)); // lock-listening -> annotation-2
  state = advanceBar(state); // annotation-2 -> annotation-2b
  state = advanceBar(state); // annotation-2b -> annotation-3
  state = advanceBar(triggerShiftBass(state)); // -> answer-queued -> answer-listening
  state = advanceBar(advanceBar(state)); // answer-listening -> annotation-4
  state = advanceBar(state); // annotation-4 -> annotation-4b
  state = advanceBar(state); // annotation-4b -> compare-prompt-lock
  state = advanceBar(triggerCompareLock(state)); // -> compare-lock-queued -> compare-lock-listening
  state = advanceBar(state); // -> compare-prompt-answer
  state = advanceBar(triggerCompareAnswer(state)); // -> compare-answer-queued -> compare-answer-listening
  state = advanceBar(state); // compare-answer-listening -> final-1
  state = advanceBar(state); // final-1 -> final-2
  state = advanceBar(state); // final-2 -> settled
  state = advanceBar(state); // settled -> Act V, entry-listening
  if (state.screen !== "exhibition" || state.act !== "act-5") {
    throw new Error("unreachable");
  }
  return state;
}

describe("exhibition state — Act IV to Act V handoff", () => {
  it("lands on Act V's entry-listening with a fresh bar count", () => {
    const state = reachAct5();
    expect(state.step).toBe("entry-listening");
    expect(state.barsInStep).toBe(0);
  });
});

describe("exhibition state — Act V bar-boundary sequence", () => {
  function reachAnnotation1(): ExhibitionState {
    return advanceBar(advanceBar(reachAct5()));
  }

  it("two bars of entry-listening advance to annotation-1", () => {
    const state = reachAnnotation1();
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("annotation-1");
  });

  function reachAnnotation2b(): ExhibitionState {
    let state = reachAnnotation1();
    state = advanceBar(advanceBar(state)); // -> annotation-2
    state = advanceBar(state); // -> annotation-2b
    return state;
  }

  it("two bars of annotation-1 advance to annotation-2, then one more to annotation-2b", () => {
    let state = reachAnnotation1();
    state = advanceBar(advanceBar(state));
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("annotation-2");

    state = advanceBar(state);
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("annotation-2b");
  });

  it("annotation-2b does not advance on bar boundaries alone — it waits on the offbeat-after-4 selection", () => {
    const state = reachAnnotation2b();
    const advanced = advanceBar(advanceBar(advanceBar(state)));
    if (advanced.screen !== "exhibition") throw new Error("unreachable");
    expect(advanced.step).toBe("annotation-2b");
  });

  function reachSpaceListening(): ExhibitionState {
    return advanceBar(selectTarget(reachAnnotation2b(), OFFBEAT_AFTER_BEAT_FOUR_INDEX));
  }

  it("selecting the offbeat after beat 4 queues the shifted low pair for both voices", () => {
    const queued = selectTarget(reachAnnotation2b(), OFFBEAT_AFTER_BEAT_FOUR_INDEX);
    if (queued.screen !== "exhibition" || queued.act !== "act-5") throw new Error("unreachable");
    expect(queued.step).toBe("move-low-queued");
    expect(pendingAct5KickIndicesForStep(queued.step)).toEqual(POCKET_SHIFTED_LOW_INDICES);
    expect(pendingAct5BassIndicesForStep(queued.step)).toEqual(POCKET_SHIFTED_LOW_INDICES);
  });

  it("the bar boundary after move-low-queued lands on space-listening", () => {
    const state = reachSpaceListening();
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("space-listening");
    expect(state.barsInStep).toBe(0);
  });

  function reachAnnotation4b(): ExhibitionState {
    let state = reachSpaceListening();
    state = advanceBar(advanceBar(state)); // -> annotation-3
    state = advanceBar(state); // -> annotation-4
    state = advanceBar(state); // -> annotation-4b
    return state;
  }

  it("two bars of space-listening advance to annotation-3, then annotation-4, then annotation-4b", () => {
    let state = reachSpaceListening();
    state = advanceBar(advanceBar(state));
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("annotation-3");

    state = advanceBar(state);
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("annotation-4");

    state = advanceBar(state);
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("annotation-4b");
  });

  it("annotation-4b does not advance on bar boundaries alone — it waits on the kick-call selection", () => {
    const state = reachAnnotation4b();
    const advanced = advanceBar(advanceBar(advanceBar(state)));
    if (advanced.screen !== "exhibition") throw new Error("unreachable");
    expect(advanced.step).toBe("annotation-4b");
  });

  function reachAnnotation4c(): ExhibitionState {
    let state = selectTarget(reachAnnotation4b(), BEAT_THREE_INDEX); // -> call-queued
    state = advanceBar(state); // -> call-listening
    state = advanceBar(state); // -> annotation-4c
    return state;
  }

  it("selecting beat 3 queues the kick call, then lands on annotation-4c after one bar of call-listening", () => {
    const queued = selectTarget(reachAnnotation4b(), BEAT_THREE_INDEX);
    if (queued.screen !== "exhibition" || queued.act !== "act-5") throw new Error("unreachable");
    expect(queued.step).toBe("call-queued");
    expect(pendingAct5KickIndicesForStep(queued.step)).toEqual(POCKET_FINAL_KICK_INDICES);
    expect(pendingAct5BassIndicesForStep(queued.step)).toBeNull();

    const state = reachAnnotation4c();
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("annotation-4c");
  });

  it("annotation-4c does not advance on bar boundaries alone — it waits on the bass-answer selection", () => {
    const state = reachAnnotation4c();
    const advanced = advanceBar(advanceBar(advanceBar(state)));
    if (advanced.screen !== "exhibition") throw new Error("unreachable");
    expect(advanced.step).toBe("annotation-4c");
  });

  function reachAnnotation5(): ExhibitionState {
    let state = selectTarget(reachAnnotation4c(), OFFBEAT_AFTER_BEAT_THREE_INDEX); // -> answer-queued
    state = advanceBar(state); // -> conversation-listening
    state = advanceBar(advanceBar(state)); // -> annotation-5
    return state;
  }

  it("selecting the offbeat after beat 3 queues the bass answer, then lands on annotation-5", () => {
    const queued = selectTarget(reachAnnotation4c(), OFFBEAT_AFTER_BEAT_THREE_INDEX);
    if (queued.screen !== "exhibition" || queued.act !== "act-5") throw new Error("unreachable");
    expect(queued.step).toBe("answer-queued");
    expect(pendingAct5BassIndicesForStep(queued.step)).toEqual(POCKET_FINAL_BASS_INDICES);
    expect(pendingAct5KickIndicesForStep(queued.step)).toBeNull();

    const state = reachAnnotation5();
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("annotation-5");
  });

  function reachComparePromptFull(): ExhibitionState {
    return advanceBar(reachAnnotation5());
  }

  it("one bar of annotation-5 advances to compare-prompt-full", () => {
    const state = reachComparePromptFull();
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("compare-prompt-full");
    expect(canTriggerFullPerformance(state)).toBe(true);
  });

  it("compare-prompt-full does not advance on bar boundaries alone — it waits on triggerFullPerformance", () => {
    let state = reachComparePromptFull();
    state = advanceBar(advanceBar(state));
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("compare-prompt-full");
  });

  function reachFullPerformanceListening(): ExhibitionState {
    return advanceBar(triggerFullPerformance(reachComparePromptFull()));
  }

  it("triggering full-performance queues no new pattern indices, then lands on full-performance-listening", () => {
    const queued = triggerFullPerformance(reachComparePromptFull());
    if (queued.screen !== "exhibition" || queued.act !== "act-5") throw new Error("unreachable");
    expect(queued.step).toBe("full-performance-queued");
    expect(pendingAct5KickIndicesForStep(queued.step)).toBeNull();
    expect(pendingAct5BassIndicesForStep(queued.step)).toBeNull();

    const state = reachFullPerformanceListening();
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("full-performance-listening");
    expect(state.barsInStep).toBe(0);
  });

  it("four bars of full-performance-listening advance to the closing final-1..5 sequence, then settle", () => {
    let state = reachFullPerformanceListening();
    state = advanceBar(advanceBar(advanceBar(advanceBar(state))));
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("final-1");

    state = advanceBar(state);
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("final-2");

    state = advanceBar(state);
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("final-3");

    state = advanceBar(state);
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("final-4");

    state = advanceBar(state);
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("final-5");

    state = advanceBar(state);
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("settled");
  });

  it("settled holds — the laboratory hand-off is a later milestone", () => {
    let state = reachFullPerformanceListening();
    for (let i = 0; i < 9; i++) state = advanceBar(state); // -> settled
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("settled");
    expect(advanceBar(state)).toEqual(state);
  });
});

describe("exhibition state — Act V guarded controls", () => {
  it("canTriggerFullPerformance is false outside compare-prompt-full", () => {
    const state = reachAct5();
    expect(canTriggerFullPerformance(state)).toBe(false);
    expect(triggerFullPerformance(state)).toEqual(state);
  });

  it("selectTarget is a no-op outside each interaction's own step/index", () => {
    const state = reachAct5();
    expect(selectTarget(state, OFFBEAT_AFTER_BEAT_FOUR_INDEX)).toEqual(state);
    expect(selectTarget(state, BEAT_THREE_INDEX)).toEqual(state);
    expect(selectTarget(state, OFFBEAT_AFTER_BEAT_THREE_INDEX)).toEqual(state);
  });

  it("do nothing on the title screen or during earlier acts", () => {
    expect(canTriggerFullPerformance({ screen: "title" })).toBe(false);
    expect(canTriggerFullPerformance(startExhibition())).toBe(false);
    expect(triggerFullPerformance({ screen: "title" })).toEqual({ screen: "title" });
  });

  it("pendingAct5KickIndicesForStep/pendingAct5BassIndicesForStep exclude every non-queued step", () => {
    expect(pendingAct5KickIndicesForStep("entry-listening")).toBeNull();
    expect(pendingAct5KickIndicesForStep("settled")).toBeNull();
    expect(pendingAct5BassIndicesForStep("entry-listening")).toBeNull();
    expect(pendingAct5BassIndicesForStep("settled")).toBeNull();
  });
});

describe("annotations — Act V", () => {
  it("shows annotation-1 pointing at beat 4 with alignment marks", () => {
    let state: ExhibitionState = advanceBar(advanceBar(reachAct5()));
    const annotation = annotationForStep(state);
    expect(annotation?.id).toBe("act5-annotation-1");
    expect(annotation?.arrowTargets).toEqual([BEAT_FOUR_INDEX]);
    expect(annotation?.alignmentIndices).toEqual([BEAT_FOUR_INDEX]);
  });

  it("shows annotation-2b inviting the move to the offbeat after beat 4", () => {
    let state: ExhibitionState = advanceBar(advanceBar(reachAct5())); // -> annotation-1
    state = advanceBar(advanceBar(state)); // -> annotation-2
    state = advanceBar(state); // -> annotation-2b
    const annotation = annotationForStep(state);
    expect(annotation?.id).toBe("act5-annotation-2b");
    expect(annotation?.arrowTargets).toEqual([OFFBEAT_AFTER_BEAT_FOUR_INDEX]);
  });

  it("reuses 'next bar…' for every queued step", () => {
    let state: ExhibitionState = advanceBar(advanceBar(reachAct5())); // -> annotation-1
    state = advanceBar(advanceBar(state)); // -> annotation-2
    state = advanceBar(state); // -> annotation-2b
    state = selectTarget(state, OFFBEAT_AFTER_BEAT_FOUR_INDEX); // -> move-low-queued
    const annotation = annotationForStep(state);
    expect(annotation?.id).toBe("next-bar");
    expect(annotation?.lines).toEqual(["next bar…"]);
  });

  it("shows annotation-4c inviting the bass answer on the offbeat after beat 3", () => {
    let state: ExhibitionState = advanceBar(advanceBar(reachAct5())); // -> annotation-1
    state = advanceBar(advanceBar(state)); // -> annotation-2
    state = advanceBar(state); // -> annotation-2b
    state = advanceBar(selectTarget(state, OFFBEAT_AFTER_BEAT_FOUR_INDEX)); // -> move-low-queued -> space-listening
    state = advanceBar(advanceBar(state)); // -> annotation-3
    state = advanceBar(state); // -> annotation-4
    state = advanceBar(state); // -> annotation-4b
    state = advanceBar(selectTarget(state, BEAT_THREE_INDEX)); // -> call-queued -> call-listening
    state = advanceBar(state); // -> annotation-4c
    const annotation = annotationForStep(state);
    expect(annotation?.id).toBe("act5-annotation-4c");
    expect(annotation?.arrowTargets).toEqual([OFFBEAT_AFTER_BEAT_THREE_INDEX]);
  });

  it("shows annotation-5 with the arc connecting the kick call to the bass answer", () => {
    let state: ExhibitionState = advanceBar(advanceBar(reachAct5())); // -> annotation-1
    state = advanceBar(advanceBar(state)); // -> annotation-2
    state = advanceBar(state); // -> annotation-2b
    state = advanceBar(selectTarget(state, OFFBEAT_AFTER_BEAT_FOUR_INDEX)); // -> move-low-queued -> space-listening
    state = advanceBar(advanceBar(state)); // -> annotation-3
    state = advanceBar(state); // -> annotation-4
    state = advanceBar(state); // -> annotation-4b
    state = advanceBar(selectTarget(state, BEAT_THREE_INDEX)); // -> call-queued -> call-listening
    state = advanceBar(state); // -> annotation-4c
    state = advanceBar(selectTarget(state, OFFBEAT_AFTER_BEAT_THREE_INDEX)); // -> answer-queued -> conversation-listening
    state = advanceBar(advanceBar(state)); // -> annotation-5
    const annotation = annotationForStep(state);
    expect(annotation?.id).toBe("act5-annotation-5");
    expect(annotation?.arcs).toEqual([
      { from: BEAT_THREE_INDEX, to: OFFBEAT_AFTER_BEAT_THREE_INDEX },
    ]);
  });

  it("shows the play-pocket prompt at compare-prompt-full", () => {
    const state = reachAct5();
    expect(annotationForStep({ ...state, step: "compare-prompt-full", barsInStep: 0 })?.id).toBe(
      "act5-compare-full",
    );
  });

  it("settled shows no annotation", () => {
    const state = reachAct5();
    expect(annotationForStep({ ...state, step: "settled", barsInStep: 0 })).toBeNull();
  });
});
