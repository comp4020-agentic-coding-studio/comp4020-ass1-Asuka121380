import { describe, expect, it } from "vitest";
import {
  ANSWER_BASS_INDICES,
  BEAT_ONE_INDEX,
  BEAT_THREE_INDEX,
  LOCK_BASS_INDICES,
} from "../src/rhythm-model";
import {
  advanceBar,
  canTriggerBringInBass,
  canTriggerCompareAnswer,
  canTriggerCompareLock,
  canTriggerShiftBass,
  pendingBassIndicesForStep,
  selectTarget,
  startExhibition,
  triggerCompare332,
  triggerCompareAnswer,
  triggerCompareBasic,
  triggerCompareLock,
  triggerFlip,
  triggerOrchestrate,
  triggerShiftBass,
  triggerBringInBass,
  type Act4Screen,
  type ExhibitionState,
} from "../src/exhibition-state";
import { annotationForStep } from "../src/annotations";

// Drives all the way from the title screen through Acts I-III into Act IV's
// opening annotation-1 — the same path a real visitor takes, since Act IV has
// no separate entry point.
function reachAct4(): Act4Screen {
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
  state = advanceBar(triggerOrchestrate(state)); // annotation-1 -> kit-queued -> kit-listening
  state = advanceBar(advanceBar(state)); // kit-listening -> annotation-2
  state = advanceBar(state); // annotation-2 -> annotation-2b
  state = advanceBar(state); // annotation-2b -> annotation-3
  state = advanceBar(selectTarget(state, 3)); // annotation-3 -> move-kick-queued -> temp-pattern-listening
  state = advanceBar(advanceBar(state)); // temp-pattern-listening -> annotation-4
  state = advanceBar(selectTarget(state, 6)); // annotation-4 -> add-beat-4-queued -> final-groove-listening
  state = advanceBar(advanceBar(state)); // final-groove-listening -> annotation-5
  state = advanceBar(state); // annotation-5 -> annotation-6
  state = advanceBar(state); // annotation-6 -> annotation-7
  state = advanceBar(state); // annotation-7 -> compare-prompt-1
  state = advanceBar(triggerCompareBasic(state)); // -> compare-basic-queued -> compare-basic-listening
  state = advanceBar(state); // compare-basic-listening -> compare-prompt-2
  state = advanceBar(triggerCompare332(state)); // -> compare-332-queued -> compare-332-listening
  state = advanceBar(state); // compare-332-listening -> settled
  state = advanceBar(state); // settled -> Act IV, annotation-1
  if (state.screen !== "exhibition" || state.act !== "act-4") {
    throw new Error("unreachable");
  }
  return state;
}

describe("exhibition state — Act III to Act IV handoff", () => {
  it("lands on Act IV's annotation-1 with a fresh bar count", () => {
    const state = reachAct4();
    expect(state.step).toBe("annotation-1");
    expect(state.barsInStep).toBe(0);
  });
});

describe("exhibition state — Act IV bar-boundary sequence", () => {
  it("annotation-1 does not advance on bar boundaries alone — it waits on the bring-in-bass reveal", () => {
    let state: ExhibitionState = reachAct4();
    state = advanceBar(advanceBar(advanceBar(state)));
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("annotation-1");
    expect(canTriggerBringInBass(state)).toBe(true);
  });

  function reachLockListening(): ExhibitionState {
    return advanceBar(triggerBringInBass(reachAct4()));
  }

  it("triggering bring-in-bass queues the new bass voice for the next barline", () => {
    const queued = triggerBringInBass(reachAct4());
    if (queued.screen !== "exhibition" || queued.act !== "act-4") throw new Error("unreachable");
    expect(queued.step).toBe("bass-queued");
    // Excluded from pendingBassIndicesForStep on purpose: it's a full voice
    // addition (addBassVoice), not a bass-index-only change.
    expect(pendingBassIndicesForStep(queued.step)).toBeNull();
  });

  it("the bar boundary after bass-queued lands on lock-listening", () => {
    const state = reachLockListening();
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("lock-listening");
    expect(state.barsInStep).toBe(0);
  });

  it("two bars of lock-listening advance to annotation-2", () => {
    let state = reachLockListening();
    state = advanceBar(advanceBar(state));
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("annotation-2");
  });

  function reachAnnotation3(): ExhibitionState {
    let state = reachLockListening();
    state = advanceBar(advanceBar(state)); // -> annotation-2
    state = advanceBar(state); // -> annotation-2b
    state = advanceBar(state); // -> annotation-3
    return state;
  }

  it("one further bar advances annotation-2 to annotation-2b, then to annotation-3", () => {
    let state = reachLockListening();
    state = advanceBar(advanceBar(state)); // -> annotation-2
    state = advanceBar(state);
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("annotation-2b");

    state = advanceBar(state);
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("annotation-3");
  });

  it("annotation-3 does not advance on bar boundaries alone — it waits on the shift-bass reveal", () => {
    const state = reachAnnotation3();
    expect(canTriggerShiftBass(state)).toBe(true);

    const advanced = advanceBar(advanceBar(advanceBar(state)));
    if (advanced.screen !== "exhibition") throw new Error("unreachable");
    expect(advanced.step).toBe("annotation-3");
  });

  function reachAnswerListening(): ExhibitionState {
    return advanceBar(triggerShiftBass(reachAnnotation3()));
  }

  it("triggering shift-bass queues the answer bass pattern", () => {
    const queued = triggerShiftBass(reachAnnotation3());
    if (queued.screen !== "exhibition" || queued.act !== "act-4") throw new Error("unreachable");
    expect(queued.step).toBe("answer-queued");
    expect(pendingBassIndicesForStep(queued.step)).toEqual(ANSWER_BASS_INDICES);
  });

  it("the bar boundary after answer-queued lands on answer-listening", () => {
    const state = reachAnswerListening();
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("answer-listening");
    expect(state.barsInStep).toBe(0);
  });

  function reachAnnotation4(): ExhibitionState {
    return advanceBar(advanceBar(reachAnswerListening()));
  }

  it("two bars of answer-listening advance to annotation-4", () => {
    const state = reachAnnotation4();
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("annotation-4");
  });

  function reachComparePromptLock(): ExhibitionState {
    let state = reachAnnotation4();
    state = advanceBar(state); // -> annotation-4b
    state = advanceBar(state); // -> compare-prompt-lock
    return state;
  }

  it("one further bar advances annotation-4 to annotation-4b, then to compare-prompt-lock", () => {
    let state = reachAnnotation4();
    state = advanceBar(state);
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("annotation-4b");

    state = advanceBar(state);
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("compare-prompt-lock");
    expect(canTriggerCompareLock(state)).toBe(true);
  });

  it("compare-prompt-lock does not advance on bar boundaries alone — it waits on triggerCompareLock", () => {
    let state = reachComparePromptLock();
    state = advanceBar(advanceBar(state));
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("compare-prompt-lock");
  });

  function reachCompareLockListening(): ExhibitionState {
    return advanceBar(triggerCompareLock(reachComparePromptLock()));
  }

  it("triggering compare-lock queues the locked bass pattern, then lands on compare-lock-listening", () => {
    const queued = triggerCompareLock(reachComparePromptLock());
    if (queued.screen !== "exhibition" || queued.act !== "act-4") throw new Error("unreachable");
    expect(queued.step).toBe("compare-lock-queued");
    expect(pendingBassIndicesForStep(queued.step)).toEqual(LOCK_BASS_INDICES);

    const state = reachCompareLockListening();
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("compare-lock-listening");
    expect(state.barsInStep).toBe(0);
  });

  function reachComparePromptAnswer(): ExhibitionState {
    return advanceBar(reachCompareLockListening());
  }

  it("one bar of compare-lock-listening advances to compare-prompt-answer", () => {
    const state = reachComparePromptAnswer();
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("compare-prompt-answer");
    expect(canTriggerCompareAnswer(state)).toBe(true);
  });

  function reachCompareAnswerListening(): ExhibitionState {
    return advanceBar(triggerCompareAnswer(reachComparePromptAnswer()));
  }

  it("triggering compare-answer queues the answer bass pattern, then lands on compare-answer-listening", () => {
    const queued = triggerCompareAnswer(reachComparePromptAnswer());
    if (queued.screen !== "exhibition" || queued.act !== "act-4") throw new Error("unreachable");
    expect(queued.step).toBe("compare-answer-queued");
    expect(pendingBassIndicesForStep(queued.step)).toEqual(ANSWER_BASS_INDICES);

    const state = reachCompareAnswerListening();
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("compare-answer-listening");
  });

  it("one bar of compare-answer-listening lands on final-1, which forces the bass back to lock", () => {
    const state = advanceBar(reachCompareAnswerListening());
    if (state.screen !== "exhibition" || state.act !== "act-4") throw new Error("unreachable");
    expect(state.step).toBe("final-1");
    expect(pendingBassIndicesForStep(state.step)).toEqual(LOCK_BASS_INDICES);
  });

  function reachFinal2(): ExhibitionState {
    return advanceBar(advanceBar(reachCompareAnswerListening()));
  }

  it("one bar of final-1 advances to final-2", () => {
    const state = reachFinal2();
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("final-2");
  });

  it("one bar of final-2 settles Act IV", () => {
    const state = advanceBar(reachFinal2());
    if (state.screen !== "exhibition") throw new Error("unreachable");
    expect(state.step).toBe("settled");
  });

  it("settled hands off directly into Act V's entry-listening", () => {
    const settled = advanceBar(reachFinal2());
    const next = advanceBar(settled);
    if (next.screen !== "exhibition") throw new Error("unreachable");
    expect(next.act).toBe("act-5");
    expect(next.step).toBe("entry-listening");
    expect(next.barsInStep).toBe(0);
  });
});

describe("exhibition state — Act IV guarded controls", () => {
  it("canTriggerBringInBass/canTriggerShiftBass/canTriggerCompareLock/canTriggerCompareAnswer are false outside their own step", () => {
    const state = reachAct4();
    expect(canTriggerShiftBass(state)).toBe(false);
    expect(canTriggerCompareLock(state)).toBe(false);
    expect(canTriggerCompareAnswer(state)).toBe(false);
    expect(triggerShiftBass(state)).toEqual(state);
    expect(triggerCompareLock(state)).toEqual(state);
    expect(triggerCompareAnswer(state)).toEqual(state);
  });

  it("triggerBringInBass is a no-op once already past annotation-1", () => {
    const state = advanceBar(triggerBringInBass(reachAct4())); // lock-listening
    expect(canTriggerBringInBass(state)).toBe(false);
    expect(triggerBringInBass(state)).toEqual(state);
  });

  it("do nothing on the title screen or during earlier acts", () => {
    expect(canTriggerBringInBass({ screen: "title" })).toBe(false);
    expect(canTriggerBringInBass(startExhibition())).toBe(false);
    expect(canTriggerShiftBass({ screen: "title" })).toBe(false);
    expect(canTriggerCompareLock({ screen: "title" })).toBe(false);
    expect(canTriggerCompareAnswer({ screen: "title" })).toBe(false);
  });

  it("pendingBassIndicesForStep excludes bass-queued and every non-queued step", () => {
    expect(pendingBassIndicesForStep("bass-queued")).toBeNull();
    expect(pendingBassIndicesForStep("annotation-1")).toBeNull();
    expect(pendingBassIndicesForStep("lock-listening")).toBeNull();
    expect(pendingBassIndicesForStep("settled")).toBeNull();
  });
});

describe("annotations — Act IV", () => {
  it("shows annotation-1 upper-left inviting the bass reveal", () => {
    const annotation = annotationForStep(reachAct4());
    expect(annotation?.id).toBe("act4-annotation-1");
    expect(annotation?.position).toBe("upper-left");
  });

  it("reuses 'next bar…' for every queued step", () => {
    const queued = triggerBringInBass(reachAct4());
    const annotation = annotationForStep(queued);
    expect(annotation?.id).toBe("next-bar");
    expect(annotation?.lines).toEqual(["next bar…"]);
  });

  it("shows annotation-2 with alignment lines at the locked bass indices", () => {
    let state: ExhibitionState = advanceBar(triggerBringInBass(reachAct4()));
    state = advanceBar(advanceBar(state)); // lock-listening -> annotation-2
    const annotation = annotationForStep(state);
    expect(annotation?.id).toBe("act4-annotation-2");
    expect(annotation?.alignmentIndices).toEqual(LOCK_BASS_INDICES);
  });

  it("shows annotation-2b with the circled word 'locks.'", () => {
    let state: ExhibitionState = advanceBar(triggerBringInBass(reachAct4()));
    state = advanceBar(advanceBar(state)); // -> annotation-2
    state = advanceBar(state); // -> annotation-2b
    const annotation = annotationForStep(state);
    expect(annotation?.id).toBe("act4-annotation-2b");
    expect(annotation?.circleWord).toBe("locks.");
  });

  it("shows annotation-4 with arcs pairing each locked attack to its answering one", () => {
    let state: ExhibitionState = advanceBar(triggerBringInBass(reachAct4()));
    state = advanceBar(advanceBar(state)); // -> annotation-2
    state = advanceBar(state); // -> annotation-2b
    state = advanceBar(state); // -> annotation-3
    state = advanceBar(triggerShiftBass(state)); // -> answer-queued -> answer-listening
    state = advanceBar(advanceBar(state)); // -> annotation-4
    const annotation = annotationForStep(state);
    expect(annotation?.id).toBe("act4-annotation-4");
    expect(annotation?.arcs).toEqual(
      LOCK_BASS_INDICES.map((from, i) => ({ from, to: ANSWER_BASS_INDICES[i] })),
    );
  });
});
