import {
  BEAT_ONE_INDEX,
  BEAT_THREE_INDEX,
  BEAT_TWO_INDEX,
  BEAT_FOUR_INDEX,
  OFFBEAT_AFTER_BEAT_TWO_INDEX,
  type EighthIndex,
} from "./rhythm-model";
import type { Act2Step, Act3Step, ExhibitionState } from "./exhibition-state";

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
    | "act2-compare-2"
    | "act3-annotation-1"
    | "act3-annotation-2"
    | "act3-annotation-2b"
    | "act3-annotation-3"
    | "act3-annotation-4"
    | "act3-annotation-5"
    | "act3-annotation-6"
    | "act3-annotation-7"
    | "act3-compare-1"
    | "act3-compare-2";
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
  // Act III's informal grouping braces (EXHIBITION_FLOW.md section 8:
  // annotation-1's whole-voice bracket, annotation-5's labelled 3-3-2 braces)
  // — explanatory braces over a contiguous run of eighth-slots, never
  // musical tuplets. One primitive covers both an unlabeled single bracket
  // and several labelled ones.
  readonly groupBraces?: readonly {
    readonly startIndex: EighthIndex;
    readonly endIndex: EighthIndex;
    readonly label?: string;
  }[];
  // Annotation-3's hand-written arc from the bass-drum note on beat 3 to the
  // offbeat after beat 2, drawn below the staff.
  readonly arcFrom?: EighthIndex;
  readonly arcTo?: EighthIndex;
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

// EXHIBITION_FLOW.md section 8 (Act III). Annotation-1's two-corner staging
// ("first line upper-left; second note lower-right. A loose arrow brackets
// the abstract notes as one voice") is simplified the same way act2's own
// annotation-4 was above: one position carrying both lines, plus the new
// unlabeled `groupBraces` bracket standing in for the loose arrow around the
// whole abstract voice (slots 0-7). Annotation-6 gets the same treatment.
function act3AnnotationForStep(step: Act3Step): AnnotationContent | null {
  switch (step) {
    case "annotation-1":
      return {
        id: "act3-annotation-1",
        position: "upper-left",
        lines: [
          "So far, every beat has had the same voice.",
          "A drummer divides the weight between hands and feet.",
        ],
        groupBraces: [{ startIndex: BEAT_ONE_INDEX, endIndex: 7 }],
      };
    case "kit-queued":
    case "move-kick-queued":
    case "add-beat-4-queued":
    case "compare-basic-queued":
    case "compare-332-queued":
      return NEXT_BAR;
    case "annotation-2":
      return {
        id: "act3-annotation-2",
        position: "upper-left",
        lines: [
          "The hi-hat keeps time.",
          "The snare carries the backbeat.",
          "The kick grounds 1 and 3.",
        ],
        offsetLines: true,
      };
    case "annotation-2b":
      return {
        id: "act3-annotation-2b",
        position: "upper-right",
        lines: ["The kit is complete.", "But the low voice is still predictable."],
      };
    case "annotation-3":
      return {
        id: "act3-annotation-3",
        position: "lower-left",
        lines: ["Let the kick step outside the square.", "Pull the kick on 3 one eighth early. ↖"],
        arrowTargets: [OFFBEAT_AFTER_BEAT_TWO_INDEX],
        arcFrom: BEAT_THREE_INDEX,
        arcTo: OFFBEAT_AFTER_BEAT_TWO_INDEX,
      };
    case "annotation-4":
      return {
        id: "act3-annotation-4",
        position: "upper-right",
        lines: ["One more low hit completes the cycle.", "Add the kick on 4. ↘"],
        arrowTargets: [BEAT_FOUR_INDEX],
      };
    case "annotation-5":
      return {
        id: "act3-annotation-5",
        position: "upper-left",
        lines: ["Three.", "Three.", "Two."],
        offsetLines: true,
        groupBraces: [
          { startIndex: BEAT_ONE_INDEX, endIndex: BEAT_TWO_INDEX, label: "3" },
          { startIndex: OFFBEAT_AFTER_BEAT_TWO_INDEX, endIndex: 5, label: "3" },
          { startIndex: BEAT_FOUR_INDEX, endIndex: 7, label: "2" },
        ],
      };
    case "annotation-6":
      return {
        id: "act3-annotation-6",
        position: "upper-right",
        lines: ["The grid stayed still.", "The kick stepped across it."],
      };
    case "annotation-7":
      return {
        id: "act3-annotation-7",
        position: "upper-right",
        lines: ["Syncopation lets one part", "pull against the time kept by another."],
      };
    case "compare-prompt-1":
      return {
        id: "act3-compare-1",
        position: "lower-left",
        lines: ["Listen to the basic kit.", "Basic kit ↓"],
      };
    case "compare-prompt-2":
      return {
        id: "act3-compare-2",
        position: "lower-left",
        lines: ["Now the finished groove.", "3-3-2 kick ↓"],
      };
    case "kit-listening":
    case "temp-pattern-listening":
    case "final-groove-listening":
    case "compare-basic-listening":
    case "compare-332-listening":
    case "settled":
      return null;
  }
}

// One annotation is visible at a time (EXHIBITION_FLOW.md section 4.4): the
// exhibition step is the single source of truth for what's on screen, so
// there's nothing else to derive this from.
export function annotationForStep(state: ExhibitionState): AnnotationContent | null {
  if (state.screen !== "exhibition") return null;

  switch (state.act) {
    case "act-1":
      return act1AnnotationForStep(state.step);
    case "act-2":
      return act2AnnotationForStep(state.step);
    case "act-3":
      return act3AnnotationForStep(state.step);
  }
}
