import {
  BEAT_ONE_INDEX,
  BEAT_THREE_INDEX,
  BEAT_TWO_INDEX,
  BEAT_FOUR_INDEX,
  OFFBEAT_AFTER_BEAT_TWO_INDEX,
  OFFBEAT_AFTER_BEAT_THREE_INDEX,
  OFFBEAT_AFTER_BEAT_FOUR_INDEX,
  LOCK_BASS_INDICES,
  ANSWER_BASS_INDICES,
  type EighthIndex,
} from "./rhythm-model";
import type {
  Act2Step,
  Act3Step,
  Act4Step,
  Act5Step,
  ExhibitionState,
} from "./exhibition-state";

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
    | "act3-compare-2"
    | "act4-annotation-1"
    | "act4-annotation-2"
    | "act4-annotation-2b"
    | "act4-annotation-3"
    | "act4-annotation-4"
    | "act4-annotation-4b"
    | "act4-compare-lock"
    | "act4-compare-answer"
    | "act4-final-1"
    | "act4-final-2"
    | "act5-annotation-1"
    | "act5-annotation-2"
    | "act5-annotation-2b"
    | "act5-annotation-3"
    | "act5-annotation-4"
    | "act5-annotation-4b"
    | "act5-annotation-4c"
    | "act5-annotation-5"
    | "act5-compare-full"
    | "act5-final-1"
    | "act5-final-2"
    | "act5-final-3"
    | "act5-final-4"
    | "act5-final-5";
  readonly position: AnnotationPosition;
  readonly lines: readonly string[];
  // The word within `lines` to underline with a hand-drawn stroke.
  readonly underlineWord?: string;
  // The word within `lines` to circle with a hand-drawn stroke (Act IV
  // annotation-2b's "Circle 'locks.'").
  readonly circleWord?: string;
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
  // Hand-written arcs between eighth-note slots, drawn below the staff — Act
  // III's annotation-3 uses one (bass-drum note on beat 3 to the offbeat
  // after beat 2), Act IV's annotation-4 uses three (each bass-drum attack to
  // its following "answer" bass note).
  readonly arcs?: readonly { readonly from: EighthIndex; readonly to: EighthIndex }[];
  // Act IV annotation-2's vertical alignment lines between coincident
  // bass-drum and bass noteheads (drawn using notation.ts's kickNoteYs/
  // bassNoteYs exports rather than re-deriving stave geometry).
  readonly alignmentIndices?: readonly EighthIndex[];
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
        arcs: [{ from: BEAT_THREE_INDEX, to: OFFBEAT_AFTER_BEAT_TWO_INDEX }],
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

// EXHIBITION_FLOW.md section 9 (Act IV). The lock/answer bass arcs pair each
// LOCK_BASS_INDICES attack with its corresponding ANSWER_BASS_INDICES attack
// (same beat, one eighth later) rather than a hard-coded literal, so the arcs
// stay correct if either index list is ever retuned.
const ANSWER_ARCS: readonly { from: EighthIndex; to: EighthIndex }[] =
  LOCK_BASS_INDICES.map((from, i) => ({ from, to: ANSWER_BASS_INDICES[i] }));

function act4AnnotationForStep(step: Act4Step): AnnotationContent | null {
  switch (step) {
    case "annotation-1":
      return {
        id: "act4-annotation-1",
        position: "upper-left",
        lines: [
          "So far, the kit has carried the groove by itself.",
          "A groove rarely lives alone.",
          "Give it a low voice. ↓",
        ],
      };
    case "bass-queued":
      return NEXT_BAR;
    case "lock-listening":
      return null;
    case "annotation-2":
      return {
        id: "act4-annotation-2",
        position: "upper-right",
        lines: ["Same rhythm. More weight."],
        alignmentIndices: LOCK_BASS_INDICES,
      };
    case "annotation-2b":
      return {
        id: "act4-annotation-2b",
        position: "upper-right",
        lines: ["When they land together,", "the groove locks."],
        circleWord: "locks.",
      };
    case "annotation-3":
      return {
        id: "act4-annotation-3",
        position: "lower-left",
        lines: ["What if the bass arrives one step later?", "Shift the bass →"],
      };
    case "answer-queued":
      return NEXT_BAR;
    case "answer-listening":
      return null;
    case "annotation-4":
      return {
        id: "act4-annotation-4",
        position: "upper-left",
        lines: ["The bass no longer follows.", "It answers."],
        arcs: ANSWER_ARCS,
      };
    case "annotation-4b":
      return {
        id: "act4-annotation-4b",
        position: "upper-right",
        lines: ["The silence between them matters too."],
      };
    case "compare-prompt-lock":
      return {
        id: "act4-compare-lock",
        position: "lower-left",
        lines: ["Listen to the lock.", "lock ↓"],
      };
    case "compare-lock-queued":
      return NEXT_BAR;
    case "compare-lock-listening":
      return null;
    case "compare-prompt-answer":
      return {
        id: "act4-compare-answer",
        position: "lower-left",
        lines: ["Now the answer.", "answer ↓"],
      };
    case "compare-answer-queued":
      return NEXT_BAR;
    case "compare-answer-listening":
      return null;
    case "final-1":
      return {
        id: "act4-final-1",
        position: "upper-left",
        lines: ["Together feels strong.", "Apart creates movement."],
      };
    case "final-2":
      return {
        id: "act4-final-2",
        position: "upper-right",
        lines: ["Can one bar do both?", "build a pocket ↘"],
      };
    case "settled":
      return null;
  }
}

// EXHIBITION_FLOW.md section 10 (Act V). Annotation 1's two-corner staging
// ("first line between the two staves; second line beside beat 4 with an
// arrow") is simplified the same way act2's/act3's own two-corner
// annotations were above: one position carrying both lines, with an arrow
// and alignment marks at beat 4 standing in for the "vertically aligned
// voices" call-out. The hand-drawn arc connecting the kick call to the bass
// answer (interaction step 4) is drawn once both notes exist, at
// annotation-5, rather than as a preview beforehand — that mirrors Act III's
// annotation-3, whose own preview arc points at a target that already exists
// as a ghost note by that step, unlike here where the bass note doesn't
// exist until the visitor selects it.
function act5AnnotationForStep(step: Act5Step): AnnotationContent | null {
  switch (step) {
    case "entry-listening":
      return null;
    case "annotation-1":
      return {
        id: "act5-annotation-1",
        position: "upper-right",
        lines: ["Lock feels strong.", "But listen closely to 4."],
        arrowTargets: [BEAT_FOUR_INDEX],
        alignmentIndices: [BEAT_FOUR_INDEX],
      };
    case "annotation-2":
      return {
        id: "act5-annotation-2",
        position: "upper-right",
        lines: ["Too much lands on 4."],
        arrowTargets: [BEAT_FOUR_INDEX],
        alignmentIndices: [BEAT_FOUR_INDEX],
      };
    case "annotation-2b":
      return {
        id: "act5-annotation-2b",
        position: "lower-left",
        lines: ["Give the snare some room.", "Move the low pair to the \"&\". ↘"],
        arrowTargets: [OFFBEAT_AFTER_BEAT_FOUR_INDEX],
      };
    case "move-low-queued":
      return NEXT_BAR;
    case "space-listening":
      return null;
    case "annotation-3":
      return {
        id: "act5-annotation-3",
        position: "lower-right",
        lines: ["Better.", "The backbeat has space to speak."],
        arrowTargets: [BEAT_FOUR_INDEX],
      };
    case "annotation-4":
      return {
        id: "act5-annotation-4",
        position: "upper-left",
        lines: ["But everything low still agrees."],
      };
    case "annotation-4b":
      return {
        id: "act5-annotation-4b",
        position: "lower-left",
        lines: ["Let the kick call on 3.", "Let the bass answer on the \"&\". ↘"],
        arrowTargets: [BEAT_THREE_INDEX],
      };
    case "call-queued":
      return NEXT_BAR;
    case "call-listening":
      return null;
    case "annotation-4c":
      return {
        id: "act5-annotation-4c",
        position: "lower-right",
        lines: ["Let the bass answer on the \"&\". ↘"],
        arrowTargets: [OFFBEAT_AFTER_BEAT_THREE_INDEX],
      };
    case "answer-queued":
      return NEXT_BAR;
    case "conversation-listening":
      return null;
    case "annotation-5":
      return {
        id: "act5-annotation-5",
        position: "upper-left",
        lines: ["Hear the whole bar."],
        arcs: [{ from: BEAT_THREE_INDEX, to: OFFBEAT_AFTER_BEAT_THREE_INDEX }],
      };
    case "compare-prompt-full":
      return {
        id: "act5-compare-full",
        position: "lower-left",
        lines: ["Hear it as one performance.", "▶ play the pocket"],
      };
    case "full-performance-queued":
    case "full-performance-listening":
      return null;
    case "final-1":
      return {
        id: "act5-final-1",
        position: "upper-left",
        lines: ["A groove is not everything", "playing together."],
      };
    case "final-2":
      return {
        id: "act5-final-2",
        position: "upper-right",
        lines: ["It is knowing when to agree—"],
      };
    case "final-3":
      return {
        id: "act5-final-3",
        position: "upper-left",
        lines: ["—and when to answer."],
      };
    case "final-4":
      return {
        id: "act5-final-4",
        position: "lower-left",
        lines: ["Groove is not one pattern.", "It is a relationship."],
      };
    case "final-5":
      return {
        id: "act5-final-5",
        position: "lower-right",
        lines: ["We built this one for you.", "Now move the weight yourself."],
      };
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
    case "act-4":
      return act4AnnotationForStep(state.step);
    case "act-5":
      return act5AnnotationForStep(state.step);
  }
}
