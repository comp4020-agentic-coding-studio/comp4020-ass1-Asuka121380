import { BEAT_ONE_INDEX, BEAT_THREE_INDEX, type EighthIndex } from "./rhythm-model";

export type ActId = "act-1";
// Extension seam for later passes: | "act-2" | "act-3" | "act-4" | "act-5"

export type Act1Step =
  | "listening"
  | "annotation-1"
  | "annotation-2"
  | "annotation-3"
  | "queued"
  | "settled";

export interface TitleScreen {
  readonly screen: "title";
}

export interface ExhibitionScreen {
  readonly screen: "exhibition";
  readonly act: ActId;
  readonly step: Act1Step;
  readonly barsInStep: number;
  readonly selectedTargets: ReadonlySet<EighthIndex>;
}

export type ExhibitionState = TitleScreen | ExhibitionScreen;

export const ACT1_TARGETS: readonly EighthIndex[] = [
  BEAT_ONE_INDEX,
  BEAT_THREE_INDEX,
];

// Bars required in "listening" before annotation-1 fires, then one bar per
// subsequent annotation step (see EXHIBITION_FLOW.md section 6).
const BARS_BEFORE_ANNOTATION_1 = 2;
const BARS_PER_STEP = 1;

export function startExhibition(): ExhibitionState {
  return {
    screen: "exhibition",
    act: "act-1",
    step: "listening",
    barsInStep: 0,
    selectedTargets: new Set(),
  };
}

export function selectableTargets(
  state: ExhibitionState,
): ReadonlySet<EighthIndex> {
  if (state.screen !== "exhibition" || state.step !== "annotation-3") {
    return new Set();
  }
  return new Set(ACT1_TARGETS);
}

export function advanceBar(state: ExhibitionState): ExhibitionState {
  if (state.screen !== "exhibition") return state;

  const barsInStep = state.barsInStep + 1;

  switch (state.step) {
    case "listening":
      return barsInStep >= BARS_BEFORE_ANNOTATION_1
        ? { ...state, step: "annotation-1", barsInStep: 0 }
        : { ...state, barsInStep };
    case "annotation-1":
      return barsInStep >= BARS_PER_STEP
        ? { ...state, step: "annotation-2", barsInStep: 0 }
        : { ...state, barsInStep };
    case "annotation-2":
      return barsInStep >= BARS_PER_STEP
        ? { ...state, step: "annotation-3", barsInStep: 0 }
        : { ...state, barsInStep };
    case "annotation-3":
      // Waits on selectTarget(), not on bar count.
      return { ...state, barsInStep };
    case "queued":
      // Any bar boundary while queued applies the accent and settles Act I.
      return { ...state, step: "settled", barsInStep: 0 };
    case "settled":
      return state;
  }
}

export function selectTarget(
  state: ExhibitionState,
  index: EighthIndex,
): ExhibitionState {
  if (state.screen !== "exhibition" || state.step !== "annotation-3") {
    return state;
  }
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
