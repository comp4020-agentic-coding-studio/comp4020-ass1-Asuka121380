import { BEAT_ONE_INDEX, BEAT_THREE_INDEX, type EighthIndex } from "./rhythm-model";
import type { ExhibitionState } from "./exhibition-state";

export type AnnotationPosition = "upper-left" | "upper-right" | "lower-left";

export interface AnnotationContent {
  readonly id: "annotation-1" | "annotation-2" | "annotation-3" | "next-bar";
  readonly position: AnnotationPosition;
  readonly lines: readonly string[];
  // The word within `lines` to underline with a hand-drawn stroke.
  readonly underlineWord?: string;
  // Notes an arrow should point to, in the annotation-3 "tap 1 and 3" moment.
  readonly arrowTargets?: readonly EighthIndex[];
}

// One annotation is visible at a time (EXHIBITION_FLOW.md section 4.4): the
// exhibition step is the single source of truth for what's on screen, so
// there's nothing else to derive this from.
export function annotationForStep(state: ExhibitionState): AnnotationContent | null {
  if (state.screen !== "exhibition") return null;

  switch (state.step) {
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
      return {
        id: "next-bar",
        position: "lower-left",
        lines: ["next bar…"],
      };
    case "listening":
    case "settled":
      return null;
  }
}
