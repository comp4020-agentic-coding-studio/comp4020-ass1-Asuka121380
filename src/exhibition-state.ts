import {
  BEAT_ONE_INDEX,
  BEAT_THREE_INDEX,
  BEAT_TWO_INDEX,
  BEAT_FOUR_INDEX,
  OFFBEAT_AFTER_BEAT_TWO_INDEX,
  BASIC_KICK_INDICES,
  OFFBEAT_KICK_INDICES,
  SYNCOPATED_KICK_INDICES,
  type EighthIndex,
} from "./rhythm-model";

export type ActId = "act-1" | "act-2" | "act-3";
// Extension seam for later passes: | "act-4" | "act-5"

export type Act1Step =
  | "listening"
  | "annotation-1"
  | "annotation-2"
  | "annotation-3"
  | "queued";

export type Act2Step =
  | "listening"
  | "annotation-1"
  | "annotation-2"
  | "annotation-3"
  | "flip-queued"
  | "backbeat-listening"
  | "annotation-4"
  | "annotation-5"
  | "compare-prompt-1"
  | "compare-1-queued"
  | "compare-1-listening"
  | "compare-prompt-2"
  | "compare-2-queued"
  | "compare-2-listening"
  | "settled";

// Act III (EXHIBITION_FLOW.md section 8): "kit-queued"/"move-kick-queued"/
// "add-beat-4-queued"/"compare-basic-queued"/"compare-332-queued" are the
// same queue-then-apply-at-bar-boundary steps Act I's "queued" and Act II's
// "flip-queued" already use. The closing comparison mirrors Act II's own
// sequential compare-prompt-1/2 shape (a forced but simple order satisfies
// "must hear each groove at least once" without inventing a new mechanism).
export type Act3Step =
  | "annotation-1"
  | "kit-queued"
  | "kit-listening"
  | "annotation-2"
  | "annotation-2b"
  | "annotation-3"
  | "move-kick-queued"
  | "temp-pattern-listening"
  | "annotation-4"
  | "add-beat-4-queued"
  | "final-groove-listening"
  | "annotation-5"
  | "annotation-6"
  | "annotation-7"
  | "compare-prompt-1"
  | "compare-basic-queued"
  | "compare-basic-listening"
  | "compare-prompt-2"
  | "compare-332-queued"
  | "compare-332-listening"
  | "settled";

export interface TitleScreen {
  readonly screen: "title";
}

export interface Act1Screen {
  readonly screen: "exhibition";
  readonly act: "act-1";
  readonly step: Act1Step;
  readonly barsInStep: number;
  readonly selectedTargets: ReadonlySet<EighthIndex>;
}

export interface Act2Screen {
  readonly screen: "exhibition";
  readonly act: "act-2";
  readonly step: Act2Step;
  readonly barsInStep: number;
}

export interface Act3Screen {
  readonly screen: "exhibition";
  readonly act: "act-3";
  readonly step: Act3Step;
  readonly barsInStep: number;
}

export type ExhibitionScreen = Act1Screen | Act2Screen | Act3Screen;

export type ExhibitionState = TitleScreen | ExhibitionScreen;

export const ACT1_TARGETS: readonly EighthIndex[] = [
  BEAT_ONE_INDEX,
  BEAT_THREE_INDEX,
];

export const ACT2_BACKBEAT_TARGETS: readonly EighthIndex[] = [
  BEAT_TWO_INDEX,
  BEAT_FOUR_INDEX,
];

// Bars required in "listening" before annotation-1 fires, then how long each
// of annotation-1/annotation-2 holds before advancing (see EXHIBITION_FLOW.md
// section 6). A real-browser pass found a 1-bar hold too quick to read —
// each annotation now gets a full 2 bars before the next one fades in.
// annotation-3 is unaffected: it waits on selectTarget(), not bar count.
const BARS_BEFORE_ANNOTATION_1 = 2;
const BARS_PER_ANNOTATION_STEP = 2;

// Act II's own pacing (EXHIBITION_FLOW.md section 7): the opening "heavy on
// 1 and 3" hold gets the same 2-bar settle-in as Act I, but every scripted
// beat after that ("after one additional bar") advances after a single bar,
// and the flip's own bar-boundary landings ("for one full bar" / "one
// complete bar") also hold for exactly one bar.
const ACT2_BARS_BEFORE_ANNOTATION_1 = 2;
const ACT2_BARS_BEFORE_ANNOTATION_4 = 2;
const ACT2_SHORT_HOLD = 1;

// Act III's own pacing (EXHIBITION_FLOW.md section 8): "after two complete-
// kit bars" for annotation-2, then every subsequent "after one additional
// bar" beat uses the same 1-bar short hold Act II established. The two
// guided kick moves ("after two bars of the temporary pattern", "after two
// bars" before annotation-5) get their own 2-bar holds.
const ACT3_BARS_BEFORE_ANNOTATION_2 = 2;
const ACT3_SHORT_HOLD = 1;
const ACT3_BARS_TEMP_PATTERN = 2;
const ACT3_BARS_BEFORE_ANNOTATION_5 = 2;

export function startExhibition(): ExhibitionState {
  return {
    screen: "exhibition",
    act: "act-1",
    step: "listening",
    barsInStep: 0,
    selectedTargets: new Set(),
  };
}

function startAct2(): ExhibitionState {
  return {
    screen: "exhibition",
    act: "act-2",
    step: "listening",
    barsInStep: 0,
  };
}

// Annotation 1 fires "after the final Act II comparison, while the abstract
// voice remains accented on beats 2 and 4" (EXHIBITION_FLOW.md section 8) —
// Act II's own last comparison bar already provided that hold, so Act III
// opens directly on annotation-1 rather than a further silent listening step.
function startAct3(): ExhibitionState {
  return {
    screen: "exhibition",
    act: "act-3",
    step: "annotation-1",
    barsInStep: 0,
  };
}

// Every act must let the visitor return to the title screen (never a
// forward "Next") — this is the reusable transition later acts' own
// back-navigation will call, alongside Act I's.
export function returnToTitle(): ExhibitionState {
  return { screen: "title" };
}

export function selectableTargets(
  state: ExhibitionState,
): ReadonlySet<EighthIndex> {
  if (state.screen !== "exhibition") return new Set();
  if (state.act === "act-1" && state.step === "annotation-3") {
    return new Set(ACT1_TARGETS);
  }
  if (state.act === "act-3" && state.step === "annotation-3") {
    // Annotation 3's guided move: pull the kick from beat 3 onto this one
    // offbeat only (EXHIBITION_FLOW.md section 8).
    return new Set([OFFBEAT_AFTER_BEAT_TWO_INDEX]);
  }
  if (state.act === "act-3" && state.step === "annotation-4") {
    // Annotation 4's guided move: add the kick on beat 4.
    return new Set([BEAT_FOUR_INDEX]);
  }
  return new Set();
}

export function advanceBar(state: ExhibitionState): ExhibitionState {
  if (state.screen !== "exhibition") return state;

  const barsInStep = state.barsInStep + 1;

  if (state.act === "act-1") {
    switch (state.step) {
      case "listening":
        return barsInStep >= BARS_BEFORE_ANNOTATION_1
          ? { ...state, step: "annotation-1", barsInStep: 0 }
          : { ...state, barsInStep };
      case "annotation-1":
        return barsInStep >= BARS_PER_ANNOTATION_STEP
          ? { ...state, step: "annotation-2", barsInStep: 0 }
          : { ...state, barsInStep };
      case "annotation-2":
        return barsInStep >= BARS_PER_ANNOTATION_STEP
          ? { ...state, step: "annotation-3", barsInStep: 0 }
          : { ...state, barsInStep };
      case "annotation-3":
        // Waits on selectTarget(), not on bar count.
        return { ...state, barsInStep };
      case "queued":
        // Any bar boundary while queued applies the accent and moves the
        // visitor directly into Act II (EXHIBITION_FLOW.md section 6, Exit
        // condition).
        return startAct2();
    }
  }

  if (state.act === "act-3") {
    switch (state.step) {
      case "annotation-1":
        // Waits on triggerOrchestrate(), not on bar count.
        return { ...state, barsInStep };
      case "kit-queued":
        // Any bar boundary while queued applies the full drum-kit pattern
        // (main.ts) and begins the "two complete-kit bars" listening hold.
        return { ...state, step: "kit-listening", barsInStep: 0 };
      case "kit-listening":
        return barsInStep >= ACT3_BARS_BEFORE_ANNOTATION_2
          ? { ...state, step: "annotation-2", barsInStep: 0 }
          : { ...state, barsInStep };
      case "annotation-2":
        return barsInStep >= ACT3_SHORT_HOLD
          ? { ...state, step: "annotation-2b", barsInStep: 0 }
          : { ...state, barsInStep };
      case "annotation-2b":
        return barsInStep >= ACT3_SHORT_HOLD
          ? { ...state, step: "annotation-3", barsInStep: 0 }
          : { ...state, barsInStep };
      case "annotation-3":
        // Waits on selectTarget(OFFBEAT_AFTER_BEAT_TWO_INDEX), not on bar count.
        return { ...state, barsInStep };
      case "move-kick-queued":
        // Applies the temporary kick pattern (kick on 1 and the offbeat
        // after 2) and begins its own two-bar listening hold.
        return { ...state, step: "temp-pattern-listening", barsInStep: 0 };
      case "temp-pattern-listening":
        return barsInStep >= ACT3_BARS_TEMP_PATTERN
          ? { ...state, step: "annotation-4", barsInStep: 0 }
          : { ...state, barsInStep };
      case "annotation-4":
        // Waits on selectTarget(BEAT_FOUR_INDEX), not on bar count.
        return { ...state, barsInStep };
      case "add-beat-4-queued":
        // Applies the finished 3-3-2 kick pattern.
        return { ...state, step: "final-groove-listening", barsInStep: 0 };
      case "final-groove-listening":
        return barsInStep >= ACT3_BARS_BEFORE_ANNOTATION_5
          ? { ...state, step: "annotation-5", barsInStep: 0 }
          : { ...state, barsInStep };
      case "annotation-5":
        return barsInStep >= ACT3_SHORT_HOLD
          ? { ...state, step: "annotation-6", barsInStep: 0 }
          : { ...state, barsInStep };
      case "annotation-6":
        return barsInStep >= ACT3_SHORT_HOLD
          ? { ...state, step: "annotation-7", barsInStep: 0 }
          : { ...state, barsInStep };
      case "annotation-7":
        return barsInStep >= ACT3_SHORT_HOLD
          ? { ...state, step: "compare-prompt-1", barsInStep: 0 }
          : { ...state, barsInStep };
      case "compare-prompt-1":
        // Waits on triggerCompareBasic(), not on bar count.
        return { ...state, barsInStep };
      case "compare-basic-queued":
        return { ...state, step: "compare-basic-listening", barsInStep: 0 };
      case "compare-basic-listening":
        return barsInStep >= ACT3_SHORT_HOLD
          ? { ...state, step: "compare-prompt-2", barsInStep: 0 }
          : { ...state, barsInStep };
      case "compare-prompt-2":
        // Waits on triggerCompare332(), not on bar count.
        return { ...state, barsInStep };
      case "compare-332-queued":
        return { ...state, step: "compare-332-listening", barsInStep: 0 };
      case "compare-332-listening":
        return barsInStep >= ACT3_SHORT_HOLD
          ? { ...state, step: "settled", barsInStep: 0 }
          : { ...state, barsInStep };
      case "settled":
        // Extension seam for Act IV (Milestone 4).
        return state;
    }
  }

  switch (state.step) {
    case "listening":
      return barsInStep >= ACT2_BARS_BEFORE_ANNOTATION_1
        ? { ...state, step: "annotation-1", barsInStep: 0 }
        : { ...state, barsInStep };
    case "annotation-1":
      return barsInStep >= ACT2_SHORT_HOLD
        ? { ...state, step: "annotation-2", barsInStep: 0 }
        : { ...state, barsInStep };
    case "annotation-2":
      return barsInStep >= ACT2_SHORT_HOLD
        ? { ...state, step: "annotation-3", barsInStep: 0 }
        : { ...state, barsInStep };
    case "annotation-3":
      // Waits on triggerFlip(), not on bar count.
      return { ...state, barsInStep };
    case "flip-queued":
      // Any bar boundary applies the 2/4 accent pattern (main.ts) and moves
      // into a fresh listening hold before annotation-4.
      return { ...state, step: "backbeat-listening", barsInStep: 0 };
    case "backbeat-listening":
      return barsInStep >= ACT2_BARS_BEFORE_ANNOTATION_4
        ? { ...state, step: "annotation-4", barsInStep: 0 }
        : { ...state, barsInStep };
    case "annotation-4":
      return barsInStep >= ACT2_SHORT_HOLD
        ? { ...state, step: "annotation-5", barsInStep: 0 }
        : { ...state, barsInStep };
    case "annotation-5":
      return barsInStep >= ACT2_SHORT_HOLD
        ? { ...state, step: "compare-prompt-1", barsInStep: 0 }
        : { ...state, barsInStep };
    case "compare-prompt-1":
      // Waits on triggerFlip(), not on bar count.
      return { ...state, barsInStep };
    case "compare-1-queued":
      // Applies the 1/3 accent pattern and holds "for one full bar"
      // (EXHIBITION_FLOW.md section 7).
      return { ...state, step: "compare-1-listening", barsInStep: 0 };
    case "compare-1-listening":
      return barsInStep >= ACT2_SHORT_HOLD
        ? { ...state, step: "compare-prompt-2", barsInStep: 0 }
        : { ...state, barsInStep };
    case "compare-prompt-2":
      // Waits on triggerFlip(), not on bar count.
      return { ...state, barsInStep };
    case "compare-2-queued":
      // Applies the 2/4 accent pattern and holds for "one complete bar".
      return { ...state, step: "compare-2-listening", barsInStep: 0 };
    case "compare-2-listening":
      return barsInStep >= ACT2_SHORT_HOLD
        ? { ...state, step: "settled", barsInStep: 0 }
        : { ...state, barsInStep };
    case "settled":
      // Any bar boundary while settled moves the visitor directly into
      // Act III (EXHIBITION_FLOW.md section 8's opening trigger fires while
      // the abstract voice is still accented 2-and-4 from this act).
      return startAct3();
  }
}

export function selectTarget(
  state: ExhibitionState,
  index: EighthIndex,
): ExhibitionState {
  if (state.screen !== "exhibition") return state;

  if (state.act === "act-3") {
    if (state.step === "annotation-3" && index === OFFBEAT_AFTER_BEAT_TWO_INDEX) {
      return { ...state, step: "move-kick-queued", barsInStep: 0 };
    }
    if (state.step === "annotation-4" && index === BEAT_FOUR_INDEX) {
      return { ...state, step: "add-beat-4-queued", barsInStep: 0 };
    }
    return state;
  }

  if (state.act !== "act-1" || state.step !== "annotation-3") return state;
  if (!ACT1_TARGETS.includes(index)) return state;

  const selectedTargets = new Set(state.selectedTargets);
  selectedTargets.add(index);

  const completed = ACT1_TARGETS.every((target) => selectedTargets.has(target));

  return {
    ...state,
    selectedTargets,
    step: completed ? "queued" : "annotation-3",
    barsInStep: 0,
  };
}

// The three points in Act II where the handwritten "flip the accents"
// control is live (EXHIBITION_FLOW.md section 7: the inversion prompt, then
// each half of the A/B comparison).
const ACT2_FLIPPABLE_STEPS: ReadonlySet<Act2Step> = new Set([
  "annotation-3",
  "compare-prompt-1",
  "compare-prompt-2",
]);

export function canFlipAccents(state: ExhibitionState): boolean {
  return (
    state.screen === "exhibition" &&
    state.act === "act-2" &&
    ACT2_FLIPPABLE_STEPS.has(state.step)
  );
}

// The flip control itself stays hidden until annotation-3 reveals it, then
// stays visible (enabled or not, per canFlipAccents) across the backbeat
// listen and the whole A/B comparison, and hides again once Act II settles
// ("won't return until the laboratory" — EXHIBITION_FLOW.md section 7).
const ACT2_STEPS_BEFORE_FLIP_REVEAL: ReadonlySet<Act2Step> = new Set([
  "listening",
  "annotation-1",
  "annotation-2",
]);

export function isFlipControlVisible(state: ExhibitionState): boolean {
  return (
    state.screen === "exhibition" &&
    state.act === "act-2" &&
    state.step !== "settled" &&
    !ACT2_STEPS_BEFORE_FLIP_REVEAL.has(state.step)
  );
}

export function triggerFlip(state: ExhibitionState): ExhibitionState {
  if (!canFlipAccents(state) || state.screen !== "exhibition" || state.act !== "act-2") {
    return state;
  }

  switch (state.step) {
    case "annotation-3":
      return { ...state, step: "flip-queued", barsInStep: 0 };
    case "compare-prompt-1":
      return { ...state, step: "compare-1-queued", barsInStep: 0 };
    case "compare-prompt-2":
      return { ...state, step: "compare-2-queued", barsInStep: 0 };
    default:
      return state;
  }
}

// Which accent targets a queued Act II step applies once its bar boundary
// lands — main.ts uses this to queue the matching rhythm pattern alongside
// the state transition, keeping the two in lockstep without exhibition-state
// needing to know about RhythmState at all.
export function pendingAccentTargetsForStep(
  step: Act2Step,
): readonly EighthIndex[] | null {
  switch (step) {
    case "flip-queued":
    case "compare-2-queued":
      return ACT2_BACKBEAT_TARGETS;
    case "compare-1-queued":
      return ACT1_TARGETS;
    default:
      return null;
  }
}

// Annotation 1's "orchestrate the pulse" reveal button (EXHIBITION_FLOW.md
// section 8) — a one-shot activation, not a toggle like Act II's flip.
export function canTriggerOrchestrate(state: ExhibitionState): boolean {
  return (
    state.screen === "exhibition" &&
    state.act === "act-3" &&
    state.step === "annotation-1"
  );
}

export function triggerOrchestrate(state: ExhibitionState): ExhibitionState {
  if (!canTriggerOrchestrate(state) || state.screen !== "exhibition" || state.act !== "act-3") {
    return state;
  }
  return { ...state, step: "kit-queued", barsInStep: 0 };
}

// The required closing comparison's two named controls (EXHIBITION_FLOW.md
// section 8: "Temporarily reveal: basic kit, 3-3-2 kick"). Each is live only
// at its own prompt step, mirroring Act II's compare-prompt-1/2 gating.
export function canTriggerCompareBasic(state: ExhibitionState): boolean {
  return (
    state.screen === "exhibition" &&
    state.act === "act-3" &&
    state.step === "compare-prompt-1"
  );
}

export function canTriggerCompare332(state: ExhibitionState): boolean {
  return (
    state.screen === "exhibition" &&
    state.act === "act-3" &&
    state.step === "compare-prompt-2"
  );
}

export function triggerCompareBasic(state: ExhibitionState): ExhibitionState {
  if (!canTriggerCompareBasic(state) || state.screen !== "exhibition" || state.act !== "act-3") {
    return state;
  }
  return { ...state, step: "compare-basic-queued", barsInStep: 0 };
}

export function triggerCompare332(state: ExhibitionState): ExhibitionState {
  if (!canTriggerCompare332(state) || state.screen !== "exhibition" || state.act !== "act-3") {
    return state;
  }
  return { ...state, step: "compare-332-queued", barsInStep: 0 };
}

// Which kick-voice indices a queued Act III step applies once its bar
// boundary lands — main.ts uses this to queue withKickIndices(...) alongside
// the state transition, the same lockstep pattern
// pendingAccentTargetsForStep gives Act II.
export function pendingKickIndicesForStep(
  step: Act3Step,
): readonly EighthIndex[] | null {
  switch (step) {
    case "move-kick-queued":
      return OFFBEAT_KICK_INDICES;
    case "add-beat-4-queued":
      return SYNCOPATED_KICK_INDICES;
    case "compare-basic-queued":
      return BASIC_KICK_INDICES;
    case "compare-332-queued":
      return SYNCOPATED_KICK_INDICES;
    default:
      return null;
  }
}
