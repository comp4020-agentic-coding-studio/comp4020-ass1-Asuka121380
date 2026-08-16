import {
  BEAT_ONE_INDEX,
  BEAT_THREE_INDEX,
  BEAT_TWO_INDEX,
  BEAT_FOUR_INDEX,
  type EighthIndex,
} from "./rhythm-model";
import type { Act2Step, ExhibitionState } from "./exhibition-state";

export type AnnotationPosition =
  | "upper-left"
  | "upper-right"
  | "lower-left"
  | "lower-right";

export interface AnnotationContent {
  readonly id:
    | "annotation-1"
    | "annotation-2"
    | "annotation-3"
    | "next-bar"
    | "act2-annotation-1"
    | "act2-annotation-2"
    | "act2-annotation-3"
    | "act2-annotation-4"
    | "act2-annotation-5"
    | "act2-compare-1"
    | "act2-compare-2";
  readonly position: AnnotationPosition;
  readonly lines: readonly string[];
  // The word within `lines` to underline with a hand-drawn stroke.
  readonly underlineWord?: string;
  // Notes an arrow should point to (e.g. Act I's "tap 1 and 3" moment, or Act
  // II's accent-position call-outs).
  readonly arrowTargets?: readonly EighthIndex[];
  // Act II's "Solid. Square. Grounded." (EXHIBITION_FLOW.md section 7) reads
  // as three words jotted down separately rather than one line — each line
  // gets its own small hand-drawn rotation/offset when this is set.
  readonly offsetLines?: boolean;
  // Index into `lines` that should render as a smaller supporting line (Act
  // II annotation-5's "It sits at the heart of much rock and pop.").
  readonly smallLineIndex?: number;
}

const NEXT_BAR: AnnotationContent = {
  id: "next-bar",
  position: "lower-left",
  lines: ["next bar…"],
};

function act1AnnotationForStep(
  step: "listening" | "annotation-1" | "annotation-2" | "annotation-3" | "queued",
): AnnotationContent | null {
  switch (step) {
    case "annotation-1":
      return {
        id: "annotation-1",
        position: "upper-left",
        lines: ["Everything is in time."],
      };
    case "annotation-2":
      return {
        id: "annotation-2",
        position: "upper-right",
        lines: ["So why does it still feel flat?"],
        underlineWord: "flat",
      };
    case "annotation-3":
      return {
        id: "annotation-3",
        position: "lower-left",
        lines: ["Give the bar some weight.", "Tap 1 and 3. ↘"],
        arrowTargets: [BEAT_ONE_INDEX, BEAT_THREE_INDEX],
      };
    case "queued":
      return NEXT_BAR;
    case "listening":
      return null;
  }
}

// EXHIBITION_FLOW.md section 7's annotation-4 asks for two positions (first
// line upper-left, second lower-right) joined by a point-to-point shift
// arrow. The shared arrow primitive (positionArrows) only draws from a fixed
// origin corner to note targets, not between two arbitrary screen positions,
// so this is simplified to a single upper-left block carrying both lines,
// with arrows pointing at the new 2/4 accent positions — the teaching
// content (both lines, arrows at the new accents) is preserved; only the
// two-corner staging is simplified. Documented in PROCESS.md.
function act2AnnotationForStep(step: Act2Step): AnnotationContent | null {
  switch (step) {
    case "annotation-1":
      return {
        id: "act2-annotation-1",
        position: "upper-left",
        lines: ["Heavy on 1 and 3."],
        arrowTargets: [BEAT_ONE_INDEX, BEAT_THREE_INDEX],
      };
    case "annotation-2":
      return {
        id: "act2-annotation-2",
        position: "lower-right",
        lines: ["Solid.", "Square.", "Grounded."],
        offsetLines: true,
      };
    case "annotation-3":
      return {
        id: "act2-annotation-3",
        position: "upper-right",
        lines: ["What if we turn it inside out?"],
      };
    case "flip-queued":
    case "compare-1-queued":
    case "compare-2-queued":
      return NEXT_BAR;
    case "annotation-4":
      return {
        id: "act2-annotation-4",
        position: "upper-left",
        lines: ["Same eight notes.", "A different centre of gravity."],
        arrowTargets: [BEAT_TWO_INDEX, BEAT_FOUR_INDEX],
      };
    case "annotation-5":
      return {
        id: "act2-annotation-5",
        position: "upper-right",
        lines: [
          "This is the pull of a backbeat.",
          "It sits at the heart of much rock and pop.",
        ],
        arrowTargets: [BEAT_TWO_INDEX, BEAT_FOUR_INDEX],
        smallLineIndex: 1,
      };
    case "compare-prompt-1":
      return {
        id: "act2-compare-1",
        position: "lower-left",
        lines: ["Flip it back. Listen again."],
      };
    case "compare-prompt-2":
      return {
        id: "act2-compare-2",
        position: "lower-left",
        lines: ["And once more—back to 2 and 4."],
      };
    case "listening":
    case "backbeat-listening":
    case "compare-1-listening":
    case "compare-2-listening":
    case "settled":
      return null;
  }
}

// One annotation is visible at a time (EXHIBITION_FLOW.md section 4.4): the
// exhibition step is the single source of truth for what's on screen, so
// there's nothing else to derive this from.
export function annotationForStep(state: ExhibitionState): AnnotationContent | null {
  if (state.screen !== "exhibition") return null;

  return state.act === "act-1"
    ? act1AnnotationForStep(state.step)
    : act2AnnotationForStep(state.step);
}
