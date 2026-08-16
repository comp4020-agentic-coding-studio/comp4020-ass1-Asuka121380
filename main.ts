import { audioTimeToPerformanceTime } from "./src/audio-clock-sync";
import { createScheduler, type Scheduler } from "./src/audio-scheduler";
import { createDrumKitVoices } from "./src/audio-voices";
import { annotationForStep, type AnnotationContent } from "./src/annotations";
import {
  ACT1_TARGETS,
  advanceBar,
  canFlipAccents,
  canTriggerBringInBass,
  canTriggerCompare332,
  canTriggerCompareAnswer,
  canTriggerCompareBasic,
  canTriggerCompareLock,
  canTriggerFullPerformance,
  canTriggerOrchestrate,
  canTriggerShiftBass,
  isFlipControlVisible,
  pendingAccentTargetsForStep,
  pendingAct5BassIndicesForStep,
  pendingAct5KickIndicesForStep,
  pendingBassIndicesForStep,
  pendingKickIndicesForStep,
  returnToTitle,
  selectTarget,
  selectableTargets,
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
  type ActId,
  type ExhibitionState,
} from "./src/exhibition-state";
import {
  LAB_PRESETS,
  LAB_RELATIONSHIP_TOOLS,
  LAB_OBSERVATION_TEXT,
  applyLabPreset,
  applyLabRelationshipTool,
  createInitialLabState,
  cycleLabSlot,
  describeLabPattern,
  setLabMasterVolume,
  setLabTempo,
  toggleLabMute,
  type LabPreset,
  type LabRelationshipTool,
  type LabState,
} from "./src/laboratory";
import { prefersReducedMotion, watchReducedMotion } from "./src/motion";
import { renderPulseScore, type NoteBox } from "./src/notation";
import {
  BASIC_KICK_INDICES,
  BEAT_FOUR_INDEX,
  BEAT_ONE_INDEX,
  BEAT_THREE_INDEX,
  BEAT_TWO_INDEX,
  EIGHTH_LABELS,
  LOCK_BASS_INDICES,
  OFFBEAT_AFTER_BEAT_FOUR_INDEX,
  OFFBEAT_AFTER_BEAT_THREE_INDEX,
  OFFBEAT_AFTER_BEAT_TWO_INDEX,
  addBassVoice,
  applyPendingPattern,
  createDrumKitPattern,
  createInitialRhythmState,
  queuePendingPattern,
  withAccentsAt,
  withBassIndices,
  withKickIndices,
  type EighthIndex,
  type Instrument,
  type RhythmState,
} from "./src/rhythm-model";
import { initTitleScreen } from "./src/title-screen";

const SVG_NS = "http://www.w3.org/2000/svg";

let reducedMotion = prefersReducedMotion();
document.documentElement.classList.toggle("reduced-motion", reducedMotion);
watchReducedMotion((reduced) => {
  reducedMotion = reduced;
  document.documentElement.classList.toggle("reduced-motion", reduced);
});

const titleRoot = document.querySelector<HTMLElement>('[data-testid="title-screen"]');
const startButton = document.querySelector<HTMLButtonElement>(
  '[data-testid="start-button"]',
);
const stage = document.querySelector<HTMLElement>('[data-testid="score-stage"]');
const staffFrameEl = document.querySelector<HTMLDivElement>('[data-testid="staff-frame"]');
const staffContainer = document.querySelector<HTMLDivElement>('[data-testid="staff"]');
const hitTargetsContainer = document.querySelector<HTMLDivElement>(
  '[data-testid="hit-targets"]',
);
const annotationLayerEl = document.querySelector<HTMLDivElement>(
  '[data-testid="annotation-layer"]',
);
const playPauseButton = document.querySelector<HTMLButtonElement>(
  '[data-testid="play-pause"]',
);
const startOverButton = document.querySelector<HTMLButtonElement>(
  '[data-testid="start-over"]',
);
const muteToggle = document.querySelector<HTMLButtonElement>(
  '[data-testid="mute-toggle"]',
);
const beatLabelsContainer = document.querySelector<HTMLDivElement>(
  '[data-testid="beat-labels"]',
);
const playbackCursor = document.querySelector<HTMLDivElement>(
  '[data-testid="playback-cursor"]',
);
const backNavButton = document.querySelector<HTMLButtonElement>(
  '[data-testid="back-nav"]',
);
const flipAccentsButtonEl = document.querySelector<HTMLButtonElement>(
  '[data-testid="flip-accents"]',
);
const actLabelElQuery = document.querySelector<HTMLParagraphElement>(
  '[data-testid="act-label"]',
);
const orchestrateButtonEl = document.querySelector<HTMLButtonElement>(
  '[data-testid="orchestrate-kit"]',
);
const compareBasicButtonEl = document.querySelector<HTMLButtonElement>(
  '[data-testid="compare-basic"]',
);
const compare332ButtonEl = document.querySelector<HTMLButtonElement>(
  '[data-testid="compare-332"]',
);
const bringInBassButtonEl = document.querySelector<HTMLButtonElement>(
  '[data-testid="bring-in-bass"]',
);
const shiftBassButtonEl = document.querySelector<HTMLButtonElement>(
  '[data-testid="shift-bass"]',
);
const compareLockButtonEl = document.querySelector<HTMLButtonElement>(
  '[data-testid="compare-lock"]',
);
const compareAnswerButtonEl = document.querySelector<HTMLButtonElement>(
  '[data-testid="compare-answer"]',
);
const playPocketButtonEl = document.querySelector<HTMLButtonElement>(
  '[data-testid="play-pocket"]',
);
const laboratoryFlowEl = document.querySelector<HTMLDivElement>(
  '[data-testid="laboratory-flow"]',
);
const labStaffContainer = document.querySelector<HTMLDivElement>(
  '[data-testid="lab-staff"]',
);
const labHitTargetsContainer = document.querySelector<HTMLDivElement>(
  '[data-testid="lab-hit-targets"]',
);
const labObservationEl = document.querySelector<HTMLParagraphElement>(
  '[data-testid="lab-observation"]',
);
const labExitPromptEl = document.querySelector<HTMLParagraphElement>(
  '[data-testid="lab-exit-prompt"]',
);
const labMuteHihatButtonEl = document.querySelector<HTMLButtonElement>(
  '[data-testid="lab-mute-hihat-closed"]',
);
const labMuteSnareButtonEl = document.querySelector<HTMLButtonElement>(
  '[data-testid="lab-mute-snare"]',
);
const labMuteKickButtonEl = document.querySelector<HTMLButtonElement>(
  '[data-testid="lab-mute-kick"]',
);
const labMuteBassButtonEl = document.querySelector<HTMLButtonElement>(
  '[data-testid="lab-mute-bass"]',
);
const labPlayPauseButtonEl = document.querySelector<HTMLButtonElement>(
  '[data-testid="lab-play-pause"]',
);
const labRestartButtonEl = document.querySelector<HTMLButtonElement>(
  '[data-testid="lab-restart"]',
);
const labTempoInputEl = document.querySelector<HTMLInputElement>(
  '[data-testid="lab-tempo"]',
);
const labVolumeInputEl = document.querySelector<HTMLInputElement>(
  '[data-testid="lab-volume"]',
);
const labPresetsContainer = document.querySelector<HTMLDivElement>(
  '[data-testid="lab-presets"]',
);
const labToolsContainer = document.querySelector<HTMLDivElement>(
  '[data-testid="lab-tools"]',
);
const ackReplayButtonEl = document.querySelector<HTMLButtonElement>(
  '[data-testid="ack-replay"]',
);
const ackReturnButtonEl = document.querySelector<HTMLButtonElement>(
  '[data-testid="ack-return"]',
);

if (
  titleRoot &&
  startButton &&
  stage &&
  staffFrameEl &&
  staffContainer &&
  hitTargetsContainer &&
  annotationLayerEl &&
  playPauseButton &&
  startOverButton &&
  beatLabelsContainer &&
  playbackCursor &&
  backNavButton &&
  flipAccentsButtonEl &&
  actLabelElQuery &&
  orchestrateButtonEl &&
  compareBasicButtonEl &&
  compare332ButtonEl &&
  bringInBassButtonEl &&
  shiftBassButtonEl &&
  compareLockButtonEl &&
  compareAnswerButtonEl &&
  playPocketButtonEl &&
  laboratoryFlowEl &&
  labStaffContainer &&
  labHitTargetsContainer &&
  labObservationEl &&
  labExitPromptEl &&
  labMuteHihatButtonEl &&
  labMuteSnareButtonEl &&
  labMuteKickButtonEl &&
  labMuteBassButtonEl &&
  labPlayPauseButtonEl &&
  labRestartButtonEl &&
  labTempoInputEl &&
  labVolumeInputEl &&
  labPresetsContainer &&
  labToolsContainer &&
  ackReplayButtonEl &&
  ackReturnButtonEl
) {
  const stageEl = stage;
  const staffFrame = staffFrameEl;
  const staffEl = staffContainer;
  const annotationLayer = annotationLayerEl;
  const cursorEl = playbackCursor;
  const flipAccentsButton = flipAccentsButtonEl;
  const actLabelEl = actLabelElQuery;
  const orchestrateButton = orchestrateButtonEl;
  const compareBasicButton = compareBasicButtonEl;
  const compare332Button = compare332ButtonEl;
  const bringInBassButton = bringInBassButtonEl;
  const shiftBassButton = shiftBassButtonEl;
  const compareLockButton = compareLockButtonEl;
  const compareAnswerButton = compareAnswerButtonEl;
  const playPocketButton = playPocketButtonEl;
  const laboratoryFlow = laboratoryFlowEl;
  const labStaffEl = labStaffContainer;
  const labObservation = labObservationEl;
  const labExitPrompt = labExitPromptEl;
  const labPlayPauseButton = labPlayPauseButtonEl;
  const labRestartButton = labRestartButtonEl;
  const labTempoInput = labTempoInputEl;
  const labVolumeInput = labVolumeInputEl;
  const ackReplayButton = ackReplayButtonEl;
  const ackReturnButton = ackReturnButtonEl;
  let rhythmState: RhythmState = createInitialRhythmState();
  let exhibitionState: ExhibitionState = startExhibition();
  let scheduler: Scheduler | null = null;
  let currentAudioContext: AudioContext | null = null;
  let activeVoice: ReturnType<typeof createDrumKitVoices> | null = null;
  let muted = false;
  let labState: LabState | null = null;
  let currentAnnotationId: AnnotationContent["id"] | null = null;
  let latestNoteBoxes: readonly NoteBox[] = [];
  let latestKickNoteYs: readonly number[] = [];
  let latestBassNoteYs: readonly number[] = [];
  const cursorTimeouts = new Set<ReturnType<typeof setTimeout>>();
  let annotationFadeTimeoutId: ReturnType<typeof setTimeout> | null = null;
  // Kept in sync with .annotation-note's CSS transition duration in
  // styles.css (~600-900ms band) — the swap-in is scheduled to happen only
  // once the fade-out has actually finished, not on a guessed delay.
  const ANNOTATION_FADE_MS = 700;

  // Index 4 (BEAT_THREE_INDEX) and the two new Act V offbeat indices carry a
  // different meaning depending on the current act/step, so the label is
  // derived from live exhibition state rather than being a fixed per-index
  // lookup (kept in sync on every render via syncBeatTargets).
  function beatTargetLabel(index: EighthIndex, state: ExhibitionState): string {
    if (state.screen === "exhibition" && state.act === "act-5") {
      if (state.step === "annotation-2b" && index === OFFBEAT_AFTER_BEAT_FOUR_INDEX) {
        return "Move the low pair to the offbeat after beat 4";
      }
      if (state.step === "annotation-4b" && index === BEAT_THREE_INDEX) {
        return "Add the kick call on beat 3";
      }
      if (state.step === "annotation-4c" && index === OFFBEAT_AFTER_BEAT_THREE_INDEX) {
        return "Add the bass answer on the offbeat after beat 3";
      }
    }
    switch (index) {
      case BEAT_ONE_INDEX:
        return "Accent beat 1";
      case BEAT_THREE_INDEX:
        return "Accent beat 3";
      case OFFBEAT_AFTER_BEAT_TWO_INDEX:
        return "Move the kick to the offbeat after beat 2";
      case BEAT_FOUR_INDEX:
        return "Add the kick on beat 4";
      default:
        return `Beat target ${index}`;
    }
  }

  function createBeatTarget(index: EighthIndex): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "beat-target";
    button.dataset.testid = `beat-target-${index}`;
    button.setAttribute("aria-label", beatTargetLabel(index, exhibitionState));
    button.setAttribute("aria-pressed", "false");
    button.disabled = true;
    button.addEventListener("click", () => {
      if (button.disabled) return;
      exhibitionState = selectTarget(exhibitionState, index);
      if (exhibitionState.screen === "exhibition" && !rhythmState.pendingPattern) {
        if (exhibitionState.act === "act-1" && exhibitionState.step === "queued") {
          const accented = withAccentsAt(rhythmState.currentPattern, ACT1_TARGETS);
          rhythmState = queuePendingPattern(rhythmState, accented);
        } else if (exhibitionState.act === "act-3") {
          const kickIndices = pendingKickIndicesForStep(exhibitionState.step);
          if (kickIndices) {
            const withKicks = withKickIndices(rhythmState.currentPattern, kickIndices);
            rhythmState = queuePendingPattern(rhythmState, withKicks);
          }
        } else if (exhibitionState.act === "act-5") {
          const kickIndices = pendingAct5KickIndicesForStep(exhibitionState.step);
          const bassIndices = pendingAct5BassIndicesForStep(exhibitionState.step);
          if (kickIndices || bassIndices) {
            let pattern = rhythmState.currentPattern;
            if (kickIndices) pattern = withKickIndices(pattern, kickIndices);
            if (bassIndices) pattern = withBassIndices(pattern, bassIndices);
            rhythmState = queuePendingPattern(rhythmState, pattern);
          }
        }
      }
      render();
    });
    return button;
  }

  const beatTargets = new Map<EighthIndex, HTMLButtonElement>([
    [BEAT_ONE_INDEX, createBeatTarget(BEAT_ONE_INDEX)],
    [BEAT_THREE_INDEX, createBeatTarget(BEAT_THREE_INDEX)],
    [OFFBEAT_AFTER_BEAT_TWO_INDEX, createBeatTarget(OFFBEAT_AFTER_BEAT_TWO_INDEX)],
    [BEAT_FOUR_INDEX, createBeatTarget(BEAT_FOUR_INDEX)],
    [OFFBEAT_AFTER_BEAT_THREE_INDEX, createBeatTarget(OFFBEAT_AFTER_BEAT_THREE_INDEX)],
    [OFFBEAT_AFTER_BEAT_FOUR_INDEX, createBeatTarget(OFFBEAT_AFTER_BEAT_FOUR_INDEX)],
  ]);
  for (const button of beatTargets.values()) hitTargetsContainer.append(button);

  const beatLabelSpans = EIGHTH_LABELS.map((label) => {
    const span = document.createElement("span");
    span.className = "beat-label";
    span.textContent = label;
    beatLabelsContainer.append(span);
    return span;
  });

  const annotationNote = document.createElement("p");
  annotationNote.className = "annotation-note";
  annotationLayer.append(annotationNote);

  const arrowsSvg = document.createElementNS(SVG_NS, "svg");
  arrowsSvg.setAttribute("class", "annotation-arrows");
  arrowsSvg.style.display = "none";
  staffFrame.append(arrowsSvg);

  const underlineSvg = document.createElementNS(SVG_NS, "svg");
  underlineSvg.setAttribute("class", "annotation-underline");
  underlineSvg.style.display = "none";
  const underlinePath = document.createElementNS(SVG_NS, "path");
  underlinePath.setAttribute("class", "annotation-underline-path");
  underlineSvg.append(underlinePath);
  staffFrame.append(underlineSvg);

  // Act III's informal grouping braces (annotation-1's whole-voice bracket,
  // annotation-5's labelled 3-3-2 braces) — a full-frame overlay like
  // arrowsSvg, since a brace can span several noteboxes at once rather than
  // pointing at a single one.
  const groupBracesSvg = document.createElementNS(SVG_NS, "svg");
  groupBracesSvg.setAttribute("class", "annotation-group-braces");
  groupBracesSvg.style.display = "none";
  staffFrame.append(groupBracesSvg);

  // Hand-written arcs below the staff — Act III's annotation-3 draws one
  // (the kick's old beat-3 placement to the offbeat after beat 2), Act IV's
  // annotation-4 draws three (each locked bass attack to its answering one).
  // A full-frame overlay like groupBracesSvg, since more than one arc can be
  // on screen at once.
  const arcSvg = document.createElementNS(SVG_NS, "svg");
  arcSvg.setAttribute("class", "annotation-arc");
  arcSvg.style.display = "none";
  staffFrame.append(arcSvg);

  // Act IV annotation-2's vertical alignment lines between a locked bass
  // attack and the kick note it lands with — drawn using notation.ts's
  // kickNoteYs/bassNoteYs exports rather than re-deriving stave geometry.
  const alignmentSvg = document.createElementNS(SVG_NS, "svg");
  alignmentSvg.setAttribute("class", "annotation-alignment-lines");
  alignmentSvg.style.display = "none";
  staffFrame.append(alignmentSvg);

  // Act IV annotation-2b's "Circle 'locks.'" — a single hand-drawn loop
  // around one word in the annotation copy.
  const circleSvg = document.createElementNS(SVG_NS, "svg");
  circleSvg.setAttribute("class", "annotation-circle");
  circleSvg.style.display = "none";
  const circlePath = document.createElementNS(SVG_NS, "path");
  circlePath.setAttribute("class", "annotation-circle-path");
  circleSvg.append(circlePath);
  staffFrame.append(circleSvg);

  // Used when a mark's geometry is set for the first time at a new
  // annotation's content-swap moment — animates the hand-drawn stroke in.
  function animateDrawOn(path: SVGPathElement): void {
    const length = path.getTotalLength();
    if (reducedMotion) {
      setPathFullyDrawn(path);
      return;
    }
    path.style.transition = "none";
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;
    // Force a style flush so the browser registers the hidden state before
    // the transition (re-enabled next frame) animates the draw-on.
    path.getBoundingClientRect();
    path.style.transition = "";
    requestAnimationFrame(() => {
      path.style.strokeDashoffset = "0";
    });
  }

  // Used when the *same* annotation's mark is merely being repositioned (a
  // resize, or any render while nothing changed) — shows the mark already
  // fully drawn instead of replaying the draw-on animation from scratch.
  function setPathFullyDrawn(path: SVGPathElement): void {
    path.style.transition = "none";
    path.style.strokeDasharray = "";
    path.style.strokeDashoffset = "0";
  }

  function appendAnnotationLine(
    target: HTMLElement,
    line: string,
    underlineWord?: string,
    circleWord?: string,
  ): void {
    const specialWord =
      underlineWord && line.includes(underlineWord)
        ? underlineWord
        : circleWord && line.includes(circleWord)
          ? circleWord
          : undefined;
    if (!specialWord) {
      target.append(document.createTextNode(line));
      return;
    }
    const [before, after] = line.split(specialWord);
    target.append(document.createTextNode(before));
    const span = document.createElement("span");
    span.className =
      specialWord === underlineWord
        ? "annotation-underline-word"
        : "annotation-circle-word";
    span.textContent = specialWord;
    target.append(span);
    target.append(document.createTextNode(after));
  }

  const ANNOTATION_POSITION_CLASSES = [
    "annotation-pos-upper-left",
    "annotation-pos-upper-right",
    "annotation-pos-lower-left",
    "annotation-pos-lower-right",
  ];

  function renderAnnotationContent(annotation: AnnotationContent | null): void {
    annotationNote.classList.remove(...ANNOTATION_POSITION_CLASSES, "annotation-note-visible");
    annotationNote.replaceChildren();
    delete annotationNote.dataset.annotationId;
    if (!annotation) return;

    annotationNote.dataset.annotationId = annotation.id;
    annotationNote.classList.add(`annotation-pos-${annotation.position}`);
    annotation.lines.forEach((line, index) => {
      // offsetLines (Act II's "Solid. Square. Grounded.") renders each word
      // as its own scattered block rather than a single wrapped paragraph,
      // so no <br> is inserted between them — the block display does that.
      if (index > 0 && !annotation.offsetLines) {
        annotationNote.append(document.createElement("br"));
      }
      const target = annotation.offsetLines
        ? annotationNote.appendChild(document.createElement("span"))
        : annotationNote;
      if (annotation.offsetLines) target.classList.add("annotation-offset-line");
      if (index === annotation.smallLineIndex) {
        const small = target.appendChild(document.createElement("span"));
        small.classList.add("annotation-small-line");
        appendAnnotationLine(small, line, annotation.underlineWord, annotation.circleWord);
      } else {
        appendAnnotationLine(target, line, annotation.underlineWord, annotation.circleWord);
      }
    });
    // Next frame, so the browser registers the pre-fade state before the
    // opacity transition runs.
    requestAnimationFrame(() => annotationNote.classList.add("annotation-note-visible"));
  }

  // `drawOn` is true only at a new annotation's content-swap moment; a plain
  // reposition (resize, or any render of an unchanged annotation) passes
  // false so the stroke stays in its already-drawn state instead of
  // replaying the draw-on animation.
  function positionUnderline(annotation: AnnotationContent, drawOn: boolean): void {
    if (!annotation.underlineWord) {
      underlineSvg.style.display = "none";
      return;
    }
    const wordSpan = annotationNote.querySelector<HTMLSpanElement>(
      ".annotation-underline-word",
    );
    if (!wordSpan) {
      underlineSvg.style.display = "none";
      return;
    }
    const frameRect = staffFrame.getBoundingClientRect();
    const wordRect = wordSpan.getBoundingClientRect();
    const width = Math.max(wordRect.width, 1);
    underlineSvg.setAttribute("viewBox", `0 0 ${width} 10`);
    underlineSvg.style.left = `${wordRect.left - frameRect.left}px`;
    underlineSvg.style.top = `${wordRect.bottom - frameRect.top - 4}px`;
    underlineSvg.style.width = `${width}px`;
    underlineSvg.style.height = "10px";
    underlineSvg.style.display = "block";
    underlinePath.setAttribute(
      "d",
      `M1,6 Q${width / 2},${width > 20 ? 9 : 6} ${width - 1},5`,
    );
    if (drawOn) animateDrawOn(underlinePath);
    else setPathFullyDrawn(underlinePath);
  }

  function positionArrows(
    annotation: AnnotationContent,
    noteBoxes: readonly NoteBox[],
    drawOn: boolean,
  ): void {
    arrowsSvg.replaceChildren();
    const targets = annotation.arrowTargets ?? [];
    if (targets.length === 0) {
      arrowsSvg.style.display = "none";
      return;
    }
    const w = staffFrame.clientWidth;
    const h = staffFrame.clientHeight;
    arrowsSvg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    arrowsSvg.style.display = "block";

    const startX = w * 0.12;
    const startY = h * 0.88;
    for (const index of targets) {
      const box = noteBoxes[index];
      if (!box) continue;
      const endX = box.x + box.w / 2;
      const endY = box.y + box.h * 0.7;
      const controlX = (startX + endX) / 2;
      const controlY = Math.min(startY, endY) - 20;
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("class", "annotation-arrow-path");
      path.setAttribute("d", `M${startX},${startY} Q${controlX},${controlY} ${endX},${endY}`);
      arrowsSvg.append(path);
      if (drawOn) animateDrawOn(path);
      else setPathFullyDrawn(path);
    }
  }

  // Draws one unlabeled or labelled bracket per `groupBraces` entry, spanning
  // the noteboxes from startIndex to endIndex — a single continuous
  // "⊓"-shaped stroke (down-across-down) so animateDrawOn's dasharray
  // technique still works on each brace as one path.
  const BRACE_TICK_HEIGHT = 10;
  const BRACE_MARGIN_ABOVE = 14;

  function positionGroupBraces(
    annotation: AnnotationContent,
    noteBoxes: readonly NoteBox[],
    drawOn: boolean,
  ): void {
    groupBracesSvg.replaceChildren();
    const braces = annotation.groupBraces ?? [];
    if (braces.length === 0) {
      groupBracesSvg.style.display = "none";
      return;
    }
    const w = staffFrame.clientWidth;
    const h = staffFrame.clientHeight;
    groupBracesSvg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    groupBracesSvg.style.display = "block";

    for (const brace of braces) {
      const startBox = noteBoxes[brace.startIndex];
      const endBox = noteBoxes[brace.endIndex];
      if (!startBox || !endBox) continue;
      const startX = startBox.x;
      const endX = endBox.x + endBox.w;
      const y = Math.min(startBox.y, endBox.y) - BRACE_MARGIN_ABOVE;
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("class", "annotation-brace-path");
      path.setAttribute(
        "d",
        `M${startX},${y + BRACE_TICK_HEIGHT} L${startX},${y} L${endX},${y} L${endX},${y + BRACE_TICK_HEIGHT}`,
      );
      groupBracesSvg.append(path);
      if (drawOn) animateDrawOn(path);
      else setPathFullyDrawn(path);

      if (brace.label) {
        const text = document.createElementNS(SVG_NS, "text");
        text.setAttribute("class", "annotation-brace-label");
        text.setAttribute("x", `${(startX + endX) / 2}`);
        text.setAttribute("y", `${y - 4}`);
        text.setAttribute("text-anchor", "middle");
        text.textContent = brace.label;
        groupBracesSvg.append(text);
      }
    }
  }

  // Annotation-3's single arc (kick's old placement to its new offbeat) and
  // Act IV annotation-4's three arcs (each locked bass attack to its
  // answering one) — one downward-bulging curve per `arcs` entry, drawn
  // below the staff.
  function positionArcs(
    annotation: AnnotationContent,
    noteBoxes: readonly NoteBox[],
    drawOn: boolean,
  ): void {
    arcSvg.replaceChildren();
    const arcs = annotation.arcs ?? [];
    if (arcs.length === 0) {
      arcSvg.style.display = "none";
      return;
    }
    const w = staffFrame.clientWidth;
    const h = staffFrame.clientHeight;
    arcSvg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    arcSvg.style.display = "block";

    for (const arc of arcs) {
      const fromBox = noteBoxes[arc.from];
      const toBox = noteBoxes[arc.to];
      if (!fromBox || !toBox) continue;
      const startX = fromBox.x + fromBox.w / 2;
      const startY = fromBox.y + fromBox.h;
      const endX = toBox.x + toBox.w / 2;
      const endY = toBox.y + toBox.h;
      const controlX = (startX + endX) / 2;
      const controlY = Math.max(startY, endY) + 24;
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("class", "annotation-arc-path");
      path.setAttribute("d", `M${startX},${startY} Q${controlX},${controlY} ${endX},${endY}`);
      arcSvg.append(path);
      if (drawOn) animateDrawOn(path);
      else setPathFullyDrawn(path);
    }
  }

  // Act IV annotation-2's vertical lines connecting a locked bass attack's
  // notehead to the kick notehead it lands with, using the same-frame Y
  // coordinates notation.ts already computed while drawing both staves.
  function positionAlignmentLines(annotation: AnnotationContent, drawOn: boolean): void {
    alignmentSvg.replaceChildren();
    const indices = annotation.alignmentIndices ?? [];
    if (indices.length === 0) {
      alignmentSvg.style.display = "none";
      return;
    }
    const w = staffFrame.clientWidth;
    const h = staffFrame.clientHeight;
    alignmentSvg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    alignmentSvg.style.display = "block";

    for (const index of indices) {
      const box = latestNoteBoxes[index];
      const kickY = latestKickNoteYs[index];
      const bassY = latestBassNoteYs[index];
      if (!box || kickY === undefined || bassY === undefined) continue;
      const x = box.x + box.w / 2;
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("class", "annotation-alignment-line-path");
      path.setAttribute("d", `M${x},${kickY} L${x},${bassY}`);
      alignmentSvg.append(path);
      if (drawOn) animateDrawOn(path);
      else setPathFullyDrawn(path);
    }
  }

  const CIRCLE_PAD_X = 8;
  const CIRCLE_PAD_Y = 4;

  // Act IV annotation-2b's "Circle 'locks.'" — a single hand-drawn loop
  // around the word wrapped in .annotation-circle-word, built from four
  // Bezier quarter-arcs with a small deterministic asymmetry (not
  // Math.random(), so runs stay reproducible for screenshot comparison) so
  // the oval reads as drawn rather than a perfect ellipse.
  function positionCircle(annotation: AnnotationContent, drawOn: boolean): void {
    if (!annotation.circleWord) {
      circleSvg.style.display = "none";
      return;
    }
    const wordSpan = annotationNote.querySelector<HTMLSpanElement>(".annotation-circle-word");
    if (!wordSpan) {
      circleSvg.style.display = "none";
      return;
    }
    const frameRect = staffFrame.getBoundingClientRect();
    const wordRect = wordSpan.getBoundingClientRect();
    const left = wordRect.left - frameRect.left - CIRCLE_PAD_X;
    const top = wordRect.top - frameRect.top - CIRCLE_PAD_Y;
    const width = Math.max(wordRect.width + CIRCLE_PAD_X * 2, 1);
    const height = Math.max(wordRect.height + CIRCLE_PAD_Y * 2, 1);
    circleSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    circleSvg.style.left = `${left}px`;
    circleSvg.style.top = `${top}px`;
    circleSvg.style.width = `${width}px`;
    circleSvg.style.height = `${height}px`;
    circleSvg.style.display = "block";

    const cx = width / 2;
    const cy = height / 2;
    const rx = width / 2 - 1;
    const ry = height / 2 - 1;
    const wobble = Math.min(rx, ry) * 0.08;
    circlePath.setAttribute(
      "d",
      `M${cx - rx},${cy} ` +
        `C${cx - rx},${cy - ry - wobble} ${cx - rx * 0.4},${cy - ry} ${cx},${cy - ry} ` +
        `C${cx + rx * 0.5},${cy - ry} ${cx + rx},${cy - ry * 0.5} ${cx + rx},${cy} ` +
        `C${cx + rx},${cy + ry + wobble} ${cx + rx * 0.4},${cy + ry} ${cx},${cy + ry} ` +
        `C${cx - rx * 0.5},${cy + ry} ${cx - rx},${cy + ry * 0.5} ${cx - rx - wobble},${cy}`,
    );
    if (drawOn) animateDrawOn(circlePath);
    else setPathFullyDrawn(circlePath);
  }

  function clearAnnotationFadeTimeout(): void {
    if (annotationFadeTimeoutId !== null) {
      clearTimeout(annotationFadeTimeoutId);
      annotationFadeTimeoutId = null;
    }
  }

  // Cancels any in-flight fade and clears the annotation outright — used by
  // a hard reset (start-over, or the back-navigation in returnToTitle) so a
  // pending crossfade never resolves into a screen that's already gone.
  function resetAnnotationDisplay(): void {
    clearAnnotationFadeTimeout();
    annotationNote.classList.remove(...ANNOTATION_POSITION_CLASSES, "annotation-note-visible");
    annotationNote.replaceChildren();
    delete annotationNote.dataset.annotationId;
    underlineSvg.style.display = "none";
    arrowsSvg.style.display = "none";
    groupBracesSvg.style.display = "none";
    arcSvg.style.display = "none";
    alignmentSvg.style.display = "none";
    circleSvg.style.display = "none";
    currentAnnotationId = null;
  }

  function swapAnnotationIn(annotation: AnnotationContent | null): void {
    annotationFadeTimeoutId = null;
    renderAnnotationContent(annotation);
    if (!annotation) {
      underlineSvg.style.display = "none";
      arrowsSvg.style.display = "none";
      groupBracesSvg.style.display = "none";
      arcSvg.style.display = "none";
      alignmentSvg.style.display = "none";
      circleSvg.style.display = "none";
      return;
    }
    // Uses the latest known note layout rather than whatever was passed in
    // when the fade-out started — a resize during the wait must not leave
    // the arrows pointing at stale coordinates.
    requestAnimationFrame(() => {
      positionUnderline(annotation, true);
      positionArrows(annotation, latestNoteBoxes, true);
      positionGroupBraces(annotation, latestNoteBoxes, true);
      positionArcs(annotation, latestNoteBoxes, true);
      positionAlignmentLines(annotation, true);
      positionCircle(annotation, true);
    });
  }

  function syncAnnotation(noteBoxes: readonly NoteBox[]): void {
    const annotation = annotationForStep(exhibitionState);
    const nextId = annotation?.id ?? null;
    const changed = nextId !== currentAnnotationId;

    if (!changed) {
      // Nothing changed — reposition the existing marks (e.g. a resize)
      // without re-triggering the fade or the arrow/underline draw-on.
      if (annotation) {
        requestAnimationFrame(() => {
          positionUnderline(annotation, false);
          positionArrows(annotation, noteBoxes, false);
          positionGroupBraces(annotation, noteBoxes, false);
          positionArcs(annotation, noteBoxes, false);
          positionAlignmentLines(annotation, false);
          positionCircle(annotation, false);
        });
      }
      return;
    }

    currentAnnotationId = nextId;
    clearAnnotationFadeTimeout();

    // No fade-out to wait for when nothing was visible yet (the very first
    // annotation) or when motion is reduced — swap straight to a fade-in.
    const wasVisible = annotationNote.classList.contains("annotation-note-visible");
    const fadeOutMs = reducedMotion || !wasVisible ? 0 : ANNOTATION_FADE_MS;

    if (fadeOutMs === 0) {
      swapAnnotationIn(annotation);
      return;
    }

    annotationNote.classList.remove("annotation-note-visible");
    annotationFadeTimeoutId = setTimeout(() => swapAnnotationIn(annotation), fadeOutMs);
  }

  function syncBeatTargets(noteBoxes: readonly NoteBox[]): void {
    const selectable = selectableTargets(exhibitionState);
    const selected =
      exhibitionState.screen === "exhibition" && exhibitionState.act === "act-1"
        ? exhibitionState.selectedTargets
        : new Set<EighthIndex>();

    for (const [index, button] of beatTargets) {
      const isSelectable = selectable.has(index);
      const isSelected = selected.has(index);
      button.disabled = !isSelectable;
      button.classList.toggle("beat-target-active", isSelectable);
      button.classList.toggle("beat-target-selected", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
      button.setAttribute("aria-label", beatTargetLabel(index, exhibitionState));

      const box = noteBoxes[index];
      if (box) {
        button.style.left = `${box.x}px`;
        button.style.top = `${box.y}px`;
        button.style.width = `${box.w}px`;
        button.style.height = `${box.h}px`;
      }
    }
  }

  // One label per notehead, positioned directly under its NoteBox — the
  // same geometry syncBeatTargets uses — rather than laid out as prose.
  function syncBeatLabels(noteBoxes: readonly NoteBox[]): void {
    beatLabelSpans.forEach((span, index) => {
      const box = noteBoxes[index];
      if (!box) {
        span.style.display = "none";
        return;
      }
      span.style.display = "";
      span.style.left = `${box.x + box.w / 2}px`;
      span.style.top = `${box.y + box.h}px`;
    });
  }

  function clearCursorTimeouts(): void {
    for (const id of cursorTimeouts) clearTimeout(id);
    cursorTimeouts.clear();
  }

  function moveCursorTo(box: NoteBox): void {
    cursorEl.style.left = `${box.x + box.w / 2}px`;
    cursorEl.style.top = `${box.y + box.h / 2}px`;
    cursorEl.classList.add("playback-cursor-active");
  }

  function actLabelText(act: ActId): string {
    switch (act) {
      case "act-1":
        return "Act I · Pulse";
      case "act-2":
        return "Act II · Weight";
      case "act-3":
        return "Act III · Kit";
      case "act-4":
        return "Act IV · Relationship";
      case "act-5":
        return "Act V · Pocket";
    }
  }

  // The flip control stays hidden until Act II's inversion prompt reveals it,
  // remains visible (enabled or not) through the A/B comparison, and hides
  // again once Act II settles (EXHIBITION_FLOW.md section 7).
  function syncFlipControl(): void {
    const visible = isFlipControlVisible(exhibitionState);
    flipAccentsButton.hidden = !visible;
    if (!visible) return;
    flipAccentsButton.disabled = !canFlipAccents(exhibitionState);
    const backbeatAccented =
      rhythmState.currentPattern.voices[0]?.slots[BEAT_TWO_INDEX]?.accent ?? false;
    flipAccentsButton.setAttribute("aria-pressed", String(backbeatAccented));
  }

  // Each of Act III's three reveal controls is live only at the exhibition
  // step its own annotation names it in (EXHIBITION_FLOW.md section 8's
  // "orchestrate the pulse ↘" / "Basic kit ↓" / "3-3-2 kick ↓") — same
  // understated, appear-only-when-invited convention as the flip control.
  function syncAct3Controls(): void {
    orchestrateButton.hidden = !canTriggerOrchestrate(exhibitionState);
    compareBasicButton.hidden = !canTriggerCompareBasic(exhibitionState);
    compare332Button.hidden = !canTriggerCompare332(exhibitionState);
  }

  // Act IV's four reveal controls (EXHIBITION_FLOW.md section 9: "give it a
  // low voice ↓", "shift the bass →", "lock ↓", "answer ↓") — same
  // appear-only-when-invited convention as syncAct3Controls.
  function syncAct4Controls(): void {
    bringInBassButton.hidden = !canTriggerBringInBass(exhibitionState);
    shiftBassButton.hidden = !canTriggerShiftBass(exhibitionState);
    compareLockButton.hidden = !canTriggerCompareLock(exhibitionState);
    compareAnswerButton.hidden = !canTriggerCompareAnswer(exhibitionState);
  }

  // Act V's one reveal control (EXHIBITION_FLOW.md section 10: "▶ play the
  // pocket") — same appear-only-when-invited convention as syncAct3Controls/
  // syncAct4Controls.
  function syncAct5Controls(): void {
    playPocketButton.hidden = !canTriggerFullPerformance(exhibitionState);
  }

  // Laboratory (EXHIBITION_FLOW.md section 11) — the visitor's own editable
  // score. LabState holds its own pattern/tempo/volume/mute independently of
  // rhythmState (which stays parked at Act V's finished pocket groove), and
  // the single scheduler already running since onActivated keeps playing
  // straight through the Act V -> laboratory transition: getRhythmState below
  // simply switches which pattern it reads from once labState exists.
  const LAB_INSTRUMENTS: readonly Instrument[] = ["hihat-closed", "snare", "kick", "bass"];
  const LAB_ROW_HALF_HEIGHT_MAX = 20;
  const LAB_ROW_HALF_HEIGHT_MIN = 6;

  // A fixed 20px half-height (the old constant) assumes every instrument row
  // sits at least 40px from its neighbours — true for hi-hat/snare, but the
  // snare/kick gap on the drum stave is only ~20px, so a fixed band there
  // covered half of the row above and below it, stealing clicks meant for
  // the neighbouring row. Size each render's band to at most half the
  // smallest gap actually present between this render's row positions.
  function computeLabRowHalfHeight(
    rowYs: Readonly<Record<Instrument, readonly number[] | undefined>>,
  ): number {
    const canonicalYs = LAB_INSTRUMENTS.map((instrument) => rowYs[instrument]?.[0]).filter(
      (y): y is number => y !== undefined,
    );
    if (canonicalYs.length < 2) return LAB_ROW_HALF_HEIGHT_MAX;
    const sorted = [...canonicalYs].sort((a, b) => a - b);
    let minGap = Infinity;
    for (let i = 1; i < sorted.length; i++) {
      minGap = Math.min(minGap, sorted[i] - sorted[i - 1]);
    }
    return Math.min(LAB_ROW_HALF_HEIGHT_MAX, Math.max(LAB_ROW_HALF_HEIGHT_MIN, minGap / 2 - 1));
  }

  function labTargetLabel(instrument: Instrument, index: EighthIndex): string {
    const name = instrument === "kick" ? "bass drum" : instrument === "hihat-closed" ? "hi-hat" : instrument;
    return `${name}, position ${index + 1}`;
  }

  const labTargets = new Map<string, HTMLButtonElement>();
  for (const instrument of LAB_INSTRUMENTS) {
    for (let i = 0; i < 8; i++) {
      const index = i as EighthIndex;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "lab-note-target";
      button.dataset.testid = `lab-target-${instrument}-${index}`;
      button.dataset.instrument = instrument;
      button.dataset.index = String(index);
      button.style.display = "none";
      button.setAttribute("aria-label", labTargetLabel(instrument, index));
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => {
        if (!labState) return;
        labState = cycleLabSlot(labState, instrument, index);
        renderLaboratory();
      });
      labTargets.set(`${instrument}-${index}`, button);
      labHitTargetsContainer.append(button);
    }
  }

  // Left/right move along the same voice's time positions, up/down move
  // between voices at the same time position (EXHIBITION_FLOW.md section 11,
  // "Keyboard controls") — the targets are real focusable <button>s, so this
  // only ever redirects focus; activation itself is native button behaviour.
  labHitTargetsContainer.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    const active = document.activeElement;
    if (!(active instanceof HTMLButtonElement)) return;
    const instrument = active.dataset.instrument as Instrument | undefined;
    const indexAttr = active.dataset.index;
    if (!instrument || indexAttr === undefined) return;
    const index = Number(indexAttr) as EighthIndex;
    let nextInstrument: Instrument = instrument;
    let nextIndex = index;
    if (event.key === "ArrowLeft") nextIndex = ((index + 7) % 8) as EighthIndex;
    else if (event.key === "ArrowRight") nextIndex = ((index + 1) % 8) as EighthIndex;
    else {
      const pos = LAB_INSTRUMENTS.indexOf(instrument);
      const delta = event.key === "ArrowUp" ? -1 : 1;
      nextInstrument = LAB_INSTRUMENTS[(pos + delta + LAB_INSTRUMENTS.length) % LAB_INSTRUMENTS.length];
    }
    const nextButton = labTargets.get(`${nextInstrument}-${nextIndex}`);
    if (nextButton) {
      event.preventDefault();
      nextButton.focus();
    }
  });

  const labMuteButtons: readonly (readonly [Instrument, HTMLButtonElement])[] = [
    ["hihat-closed", labMuteHihatButtonEl],
    ["snare", labMuteSnareButtonEl],
    ["kick", labMuteKickButtonEl],
    ["bass", labMuteBassButtonEl],
  ];
  for (const [instrument, button] of labMuteButtons) {
    button.addEventListener("click", () => {
      if (!labState) return;
      labState = toggleLabMute(labState, instrument);
      renderLaboratory();
    });
  }

  const labPresetButtons = new Map<LabPreset, HTMLButtonElement>();
  for (const preset of LAB_PRESETS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "lab-preset";
    button.dataset.testid = `lab-preset-${preset.id}`;
    button.textContent = preset.label;
    button.addEventListener("click", () => {
      if (!labState) return;
      labState = applyLabPreset(labState, preset.id);
      renderLaboratory();
    });
    labPresetButtons.set(preset.id, button);
    labPresetsContainer.append(button);
  }

  const labToolButtons = new Map<LabRelationshipTool, HTMLButtonElement>();
  for (const tool of LAB_RELATIONSHIP_TOOLS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "lab-tool";
    button.dataset.testid = `lab-tool-${tool.id}`;
    button.textContent = tool.label;
    button.addEventListener("click", () => {
      if (!labState) return;
      labState = applyLabRelationshipTool(labState, tool.id);
      renderLaboratory();
    });
    labToolButtons.set(tool.id, button);
    labToolsContainer.append(button);
  }

  function syncLabTargets(
    noteBoxes: readonly NoteBox[],
    rowYs: Readonly<Record<Instrument, readonly number[] | undefined>>,
  ): void {
    if (!labState) return;
    const halfHeight = computeLabRowHalfHeight(rowYs);
    for (const instrument of LAB_INSTRUMENTS) {
      const ys = rowYs[instrument] ?? [];
      const voice = labState.pattern.voices.find((v) => v.instrument === instrument);
      for (let i = 0; i < 8; i++) {
        const index = i as EighthIndex;
        const button = labTargets.get(`${instrument}-${index}`);
        const box = noteBoxes[index];
        const y = ys[index];
        if (!button) continue;
        if (!box || y === undefined) {
          button.style.display = "none";
          continue;
        }
        button.style.display = "flex";
        button.style.left = `${box.x}px`;
        button.style.top = `${y - halfHeight}px`;
        button.style.width = `${box.w}px`;
        button.style.height = `${halfHeight * 2}px`;
        // The CSS class's min-height (a floor for generously-spaced rows)
        // would otherwise force overlap back in whenever the computed band
        // is thinner than it — override it inline to whatever the computed
        // band actually is.
        button.style.minHeight = `${halfHeight * 2}px`;

        const slot = voice?.slots[index];
        button.classList.toggle("lab-note-target-active", !!slot?.active);
        button.classList.toggle("lab-note-target-accented", !!slot?.accent);
        button.setAttribute("aria-pressed", String(!!slot?.active));
      }
    }
  }

  function renderLaboratory(): void {
    if (!labState) return;
    const { noteBoxes, kickNoteYs, bassNoteYs, hihatNoteYs, snareNoteYs } = renderPulseScore(
      labStaffEl,
      labState.pattern,
    );
    syncLabTargets(noteBoxes, {
      "hihat-closed": hihatNoteYs,
      snare: snareNoteYs,
      kick: kickNoteYs,
      bass: bassNoteYs,
      "practice-pad": undefined,
    });

    const observation = describeLabPattern(labState.pattern);
    labObservation.textContent = observation ? LAB_OBSERVATION_TEXT[observation] : "";
    labExitPrompt.hidden = !labState.hasEdited;

    for (const [instrument, button] of labMuteButtons) {
      button.setAttribute("aria-pressed", String(labState.mutes.has(instrument)));
    }
    labTempoInput.value = String(labState.tempoBpm);
    labVolumeInput.value = String(labState.masterVolume);
  }

  // The one-time transition into the laboratory, triggered from inside
  // onBarBoundary the instant advanceBar first reports "laboratory" — the
  // same scheduler and AudioContext already alive since onActivated keep
  // running straight through, no new gesture required.
  function enterLaboratory(): void {
    labState = createInitialLabState(rhythmState.currentPattern.tempoBpm);
    delete stageEl.dataset.act;
    delete stageEl.dataset.step;
    stageEl.classList.remove("score-stage-active");
    laboratoryFlow.classList.add("laboratory-flow-active");
    labPlayPauseButton.textContent = "⏸ pause";
    labPlayPauseButton.setAttribute("aria-pressed", "true");
    if (activeVoice) activeVoice.masterGain.gain.value = muted ? 0 : labState.masterVolume;
    renderLaboratory();
  }

  function exitLaboratoryState(): void {
    laboratoryFlow.classList.remove("laboratory-flow-active");
    labState = null;
    labExitPrompt.hidden = true;
  }

  function render(): void {
    if (exhibitionState.screen === "laboratory") {
      renderLaboratory();
      return;
    }
    // The bass stave (from Act IV) is a second real VexFlow stave drawn
    // below the drum-kit stave — the frame needs extra CSS height before
    // renderPulseScore reads the container's clientHeight, or the bass
    // stave's notes render past the SVG's viewport and get clipped.
    const hasBassVoice = rhythmState.currentPattern.voices.some(
      (voice) => voice.instrument === "bass",
    );
    staffFrame.classList.toggle("staff-frame-has-bass", hasBassVoice);
    const { noteBoxes, kickNoteYs, bassNoteYs } = renderPulseScore(
      staffEl,
      rhythmState.currentPattern,
    );
    latestNoteBoxes = noteBoxes;
    latestKickNoteYs = kickNoteYs ?? [];
    latestBassNoteYs = bassNoteYs ?? [];
    if (exhibitionState.screen === "exhibition") {
      stageEl.dataset.act = exhibitionState.act;
      stageEl.dataset.step = exhibitionState.step;
      actLabelEl.textContent = actLabelText(exhibitionState.act);
    }
    syncBeatTargets(noteBoxes);
    syncBeatLabels(noteBoxes);
    syncAnnotation(noteBoxes);
    syncFlipControl();
    syncAct3Controls();
    syncAct4Controls();
    syncAct5Controls();
  }

  const titleHandles = initTitleScreen({
    elements: { root: titleRoot, startButton, stage },
    onActivated(audioContext) {
      currentAudioContext = audioContext;
      // A return-to-title can re-arm this same activation path, so state
      // is reset here too (not just in the back-nav handler) to guarantee
      // a fresh Act I every time, regardless of what ended the last visit.
      rhythmState = createInitialRhythmState();
      exhibitionState = startExhibition();
      const voice = createDrumKitVoices(audioContext);
      activeVoice = voice;
      render();

      scheduler = createScheduler(audioContext, {
        getRhythmState: () =>
          exhibitionState.screen === "laboratory" && labState
            ? { currentPattern: labState.pattern, pendingPattern: null }
            : rhythmState,
        onNoteScheduled(slotIndex, time, note) {
          const inLaboratory = exhibitionState.screen === "laboratory";
          if (inLaboratory && labState?.mutes.has(note.instrument)) return;
          if (note.active) voice.trigger(note.instrument, time, note.velocity, note.accent);
          // The laboratory has no playback cursor (not part of its spec) —
          // the guided acts' cursor is scoped to the now-hidden score-stage's
          // own note boxes, which no longer correspond to the lab's grid.
          if (inLaboratory) return;
          // The visual cursor is driven by this timeout, but the sound above
          // was already scheduled against `time` on the audio clock — the
          // timeout only decides when the *cursor* moves, never the audio.
          // The delay is computed from the output-latency-aware wall-clock
          // mapping, not a bare currentTime subtraction, so the marker
          // arrives when the note is actually audible rather than early.
          const targetPerformanceTime = audioTimeToPerformanceTime(audioContext, time);
          const delayMs = Math.max(0, targetPerformanceTime - performance.now());
          const timeoutId = setTimeout(() => {
            cursorTimeouts.delete(timeoutId);
            const box = latestNoteBoxes[slotIndex];
            if (box) moveCursorTo(box);
          }, delayMs);
          cursorTimeouts.add(timeoutId);
        },
        onBarBoundary() {
          rhythmState = applyPendingPattern(rhythmState);
          const previousScreen = exhibitionState.screen;
          exhibitionState = advanceBar(exhibitionState);
          if (exhibitionState.screen === "laboratory" && previousScreen !== "laboratory") {
            enterLaboratory();
          }
          // Act IV's "final-1" step is reached purely by bar-count advance
          // (never a click), so it's the one case pendingBassIndicesForStep
          // needs a generic caller rather than a click handler — every other
          // non-null step it returns is already queued by its own trigger's
          // click handler before this callback next runs.
          if (
            exhibitionState.screen === "exhibition" &&
            exhibitionState.act === "act-4" &&
            !rhythmState.pendingPattern
          ) {
            const bassIndices = pendingBassIndicesForStep(exhibitionState.step);
            if (bassIndices) {
              const withBass = withBassIndices(rhythmState.currentPattern, bassIndices);
              rhythmState = queuePendingPattern(rhythmState, withBass);
            }
          }
          render();
        },
      });
      scheduler.start();

      playPauseButton.disabled = false;
      playPauseButton.textContent = "⏸ pause";
      playPauseButton.setAttribute("aria-pressed", "true");
      startOverButton.disabled = false;
      backNavButton.hidden = false;

      if (muteToggle) {
        muteToggle.disabled = false;
        muteToggle.textContent = muted ? "sound off" : "sound on";
        muteToggle.setAttribute("aria-pressed", String(muted));
      }
    },
  });

  // Attached once — `onActivated` can now re-fire (after a return-to-title
  // and a fresh start), and re-adding a listener here every time would stack
  // duplicate handlers that double-toggle mute on a single click.
  if (muteToggle) {
    muteToggle.addEventListener("click", () => {
      if (!activeVoice) return;
      muted = !muted;
      // Unmuting inside the laboratory must restore *its* volume slider
      // rather than snapping back to full gain — labState.masterVolume is
      // the source of truth for that scene's own volume control.
      const unmutedGain =
        exhibitionState.screen === "laboratory" && labState ? labState.masterVolume : 1;
      activeVoice.masterGain.gain.value = muted ? 0 : unmutedGain;
      muteToggle.textContent = muted ? "sound off" : "sound on";
      muteToggle.setAttribute("aria-pressed", String(muted));
    });
  }

  // Shared by the visible control's click handler and the global Space-bar
  // shortcut below, so both paths freeze/resume audio, the visual playhead,
  // and the accessible name/state identically — there is only ever one
  // "toggle" implementation to keep coherent.
  const togglePlayPause = (): void => {
    if (!scheduler) return;
    if (scheduler.isRunning) {
      scheduler.pause();
      clearCursorTimeouts();
      playPauseButton.textContent = "▶ play";
      playPauseButton.setAttribute("aria-pressed", "false");
      labPlayPauseButton.textContent = "▶ play";
      labPlayPauseButton.setAttribute("aria-pressed", "false");
    } else {
      void scheduler.resume().then(() => {
        playPauseButton.textContent = "⏸ pause";
        playPauseButton.setAttribute("aria-pressed", "true");
        labPlayPauseButton.textContent = "⏸ pause";
        labPlayPauseButton.setAttribute("aria-pressed", "true");
      });
    }
  };

  playPauseButton.addEventListener("click", togglePlayPause);
  labPlayPauseButton.addEventListener("click", togglePlayPause);
  labRestartButton.addEventListener("click", () => {
    scheduler?.restart();
  });

  labTempoInput.addEventListener("input", () => {
    if (!labState) return;
    labState = setLabTempo(labState, Number(labTempoInput.value));
  });

  labVolumeInput.addEventListener("input", () => {
    if (!labState) return;
    labState = setLabMasterVolume(labState, Number(labVolumeInput.value));
    if (activeVoice) activeVoice.masterGain.gain.value = muted ? 0 : labState.masterVolume;
  });

  // Any element with its own native Space/Enter semantics (a button, link,
  // form control, or contenteditable region) must keep handling Space
  // itself — otherwise a Space press on the focused play-pause button would
  // both fire its native click *and* this global handler, toggling playback
  // twice. Everything else (document body, the inert stage background)
  // falls through to the global shortcut.
  function focusOwnsSpaceKey(): boolean {
    const el = document.activeElement;
    if (!el || el === document.body) return false;
    if (el instanceof HTMLElement && el.isContentEditable) return true;
    return ["BUTTON", "A", "INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
  }

  // Enter/Space on the title screen is title-screen.ts's job (starting the
  // exhibition); once inside an act, Space toggles pause/resume everywhere
  // via the same togglePlayPause() the visible control uses, so audio, the
  // playhead, and pending pattern state always stay in lockstep with it.
  document.addEventListener("keydown", (event) => {
    if (event.key !== " " && event.key !== "Spacebar") return;
    if (exhibitionState.screen !== "exhibition" && exhibitionState.screen !== "laboratory") return;
    if (focusOwnsSpaceKey()) return;
    event.preventDefault();
    togglePlayPause();
  });

  // Laboratory-only shortcuts (EXHIBITION_FLOW.md section 11, "Keyboard
  // controls"): digits 1-7 jump straight to a curated preset, R restores the
  // finished Pocket groove — both gated the same way Space is, so a digit
  // typed into a focused control never gets hijacked.
  document.addEventListener("keydown", (event) => {
    if (exhibitionState.screen !== "laboratory" || !labState) return;
    if (focusOwnsSpaceKey()) return;
    if (event.key >= "1" && event.key <= "7") {
      const preset = LAB_PRESETS[Number(event.key) - 1];
      if (preset) {
        event.preventDefault();
        labState = applyLabPreset(labState, preset.id);
        renderLaboratory();
      }
    } else if (event.key === "r" || event.key === "R") {
      event.preventDefault();
      labState = applyLabPreset(labState, "the-pocket");
      renderLaboratory();
    }
  });

  // Resets the teaching sequence only — rhythm/exhibition state and the
  // cursor — never the scheduler or AudioContext, so audio keeps playing
  // uninterrupted and no second gesture is required to hear sound again.
  startOverButton.addEventListener("click", () => {
    clearCursorTimeouts();
    resetAnnotationDisplay();
    rhythmState = createInitialRhythmState();
    exhibitionState = startExhibition();
    cursorEl.classList.remove("playback-cursor-active");
    render();
  });

  // Every act must let the visitor return to the title screen — never a
  // forward "Next". This tears the departing act down completely (per
  // CLAUDE.md, an AudioContext may only ever be constructed inside
  // title-screen.ts, so this one is closed rather than merely muted) and
  // re-arms the title screen's first-activation path for a clean restart.
  // Shared by the header's back-nav (from any act) and the acknowledgement
  // page's "play it again" (identical semantics: tear the whole exhibition
  // down and re-arm a clean title screen) — one implementation rather than
  // two copies that could drift.
  const exitToTitle = (): void => {
    clearCursorTimeouts();
    resetAnnotationDisplay();
    cursorEl.classList.remove("playback-cursor-active");
    exitLaboratoryState();
    laboratoryFlow.scrollTop = 0;

    const closingScheduler = scheduler;
    const closingAudioContext = currentAudioContext;
    const closingVoice = activeVoice;
    scheduler = null;
    currentAudioContext = null;
    activeVoice = null;

    if (closingVoice && closingAudioContext) {
      closingVoice.masterGain.gain.linearRampToValueAtTime(
        0,
        closingAudioContext.currentTime + 0.05,
      );
    }
    closingScheduler?.destroy();
    void closingAudioContext?.close();

    rhythmState = createInitialRhythmState();
    exhibitionState = returnToTitle();
    muted = false;

    backNavButton.hidden = true;
    playPauseButton.disabled = true;
    playPauseButton.textContent = "▶ play";
    playPauseButton.setAttribute("aria-pressed", "false");
    startOverButton.disabled = true;
    if (muteToggle) {
      muteToggle.disabled = true;
      muteToggle.textContent = "sound on";
      muteToggle.setAttribute("aria-pressed", "false");
    }

    delete stageEl.dataset.act;
    delete stageEl.dataset.step;
    stageEl.classList.remove("score-stage-active");
    titleRoot.classList.remove("title-screen-fading");
    titleHandles.reset();

    render();
  };

  backNavButton.addEventListener("click", exitToTitle);
  ackReplayButton.addEventListener("click", exitToTitle);

  // "return to the laboratory" (EXHIBITION_FLOW.md section 12) scrolls back
  // up without touching labState — the visitor's edited pattern survives.
  ackReturnButton.addEventListener("click", () => {
    laboratoryFlow.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  });

  // Activating the flip queues the accent swap at the next barline rather
  // than applying it immediately (EXHIBITION_FLOW.md section 7's "Required
  // interaction: first flip") — same queue-then-apply-on-bar-boundary
  // mechanism Act I's own accent selection uses.
  flipAccentsButton.addEventListener("click", () => {
    if (flipAccentsButton.disabled || !canFlipAccents(exhibitionState)) return;
    exhibitionState = triggerFlip(exhibitionState);
    if (
      exhibitionState.screen === "exhibition" &&
      exhibitionState.act === "act-2" &&
      !rhythmState.pendingPattern
    ) {
      const targets = pendingAccentTargetsForStep(exhibitionState.step);
      if (targets) {
        const accented = withAccentsAt(rhythmState.currentPattern, targets);
        rhythmState = queuePendingPattern(rhythmState, accented);
      }
    }
    render();
  });

  // "Orchestrate the pulse ↘" (EXHIBITION_FLOW.md section 8) — a one-shot
  // reveal that introduces the full drum kit at the next barline. Unlike the
  // other Act III controls this is a full pattern swap (hi-hat/snare voices
  // appear for the first time), not a kick-only re-derivation, so it's the
  // one case pendingKickIndicesForStep deliberately excludes.
  orchestrateButton.addEventListener("click", () => {
    if (orchestrateButton.hidden || !canTriggerOrchestrate(exhibitionState)) return;
    exhibitionState = triggerOrchestrate(exhibitionState);
    if (
      exhibitionState.screen === "exhibition" &&
      exhibitionState.act === "act-3" &&
      exhibitionState.step === "kit-queued" &&
      !rhythmState.pendingPattern
    ) {
      const kit = createDrumKitPattern(rhythmState.currentPattern.tempoBpm, BASIC_KICK_INDICES);
      rhythmState = queuePendingPattern(rhythmState, kit);
    }
    render();
  });

  // The closing comparison's two named reveals (EXHIBITION_FLOW.md section
  // 8: "Temporarily reveal: basic kit, 3-3-2 kick") — both re-derive only the
  // kick voice on the already-present drum-kit pattern.
  compareBasicButton.addEventListener("click", () => {
    if (compareBasicButton.hidden || !canTriggerCompareBasic(exhibitionState)) return;
    exhibitionState = triggerCompareBasic(exhibitionState);
    if (
      exhibitionState.screen === "exhibition" &&
      exhibitionState.act === "act-3" &&
      !rhythmState.pendingPattern
    ) {
      const kickIndices = pendingKickIndicesForStep(exhibitionState.step);
      if (kickIndices) {
        const withKicks = withKickIndices(rhythmState.currentPattern, kickIndices);
        rhythmState = queuePendingPattern(rhythmState, withKicks);
      }
    }
    render();
  });

  compare332Button.addEventListener("click", () => {
    if (compare332Button.hidden || !canTriggerCompare332(exhibitionState)) return;
    exhibitionState = triggerCompare332(exhibitionState);
    if (
      exhibitionState.screen === "exhibition" &&
      exhibitionState.act === "act-3" &&
      !rhythmState.pendingPattern
    ) {
      const kickIndices = pendingKickIndicesForStep(exhibitionState.step);
      if (kickIndices) {
        const withKicks = withKickIndices(rhythmState.currentPattern, kickIndices);
        rhythmState = queuePendingPattern(rhythmState, withKicks);
      }
    }
    render();
  });

  // "Give it a low voice ↓" (EXHIBITION_FLOW.md section 9) — introduces the
  // bass voice for the first time. Like orchestrateButton, this is a full
  // pattern addition rather than a kick-only re-derivation, so it calls
  // addBassVoice directly instead of going through
  // pendingBassIndicesForStep (which deliberately excludes "bass-queued").
  bringInBassButton.addEventListener("click", () => {
    if (bringInBassButton.hidden || !canTriggerBringInBass(exhibitionState)) return;
    exhibitionState = triggerBringInBass(exhibitionState);
    if (
      exhibitionState.screen === "exhibition" &&
      exhibitionState.act === "act-4" &&
      exhibitionState.step === "bass-queued" &&
      !rhythmState.pendingPattern
    ) {
      const withBass = addBassVoice(rhythmState.currentPattern, LOCK_BASS_INDICES);
      rhythmState = queuePendingPattern(rhythmState, withBass);
    }
    render();
  });

  // Act IV's three re-derivation reveals ("shift the bass →", "lock ↓",
  // "answer ↓") — each re-derives only the bass voice on the already-present
  // bass staff, same shape as compareBasicButton/compare332Button.
  shiftBassButton.addEventListener("click", () => {
    if (shiftBassButton.hidden || !canTriggerShiftBass(exhibitionState)) return;
    exhibitionState = triggerShiftBass(exhibitionState);
    if (
      exhibitionState.screen === "exhibition" &&
      exhibitionState.act === "act-4" &&
      !rhythmState.pendingPattern
    ) {
      const bassIndices = pendingBassIndicesForStep(exhibitionState.step);
      if (bassIndices) {
        const withBass = withBassIndices(rhythmState.currentPattern, bassIndices);
        rhythmState = queuePendingPattern(rhythmState, withBass);
      }
    }
    render();
  });

  compareLockButton.addEventListener("click", () => {
    if (compareLockButton.hidden || !canTriggerCompareLock(exhibitionState)) return;
    exhibitionState = triggerCompareLock(exhibitionState);
    if (
      exhibitionState.screen === "exhibition" &&
      exhibitionState.act === "act-4" &&
      !rhythmState.pendingPattern
    ) {
      const bassIndices = pendingBassIndicesForStep(exhibitionState.step);
      if (bassIndices) {
        const withBass = withBassIndices(rhythmState.currentPattern, bassIndices);
        rhythmState = queuePendingPattern(rhythmState, withBass);
      }
    }
    render();
  });

  compareAnswerButton.addEventListener("click", () => {
    if (compareAnswerButton.hidden || !canTriggerCompareAnswer(exhibitionState)) return;
    exhibitionState = triggerCompareAnswer(exhibitionState);
    if (
      exhibitionState.screen === "exhibition" &&
      exhibitionState.act === "act-4" &&
      !rhythmState.pendingPattern
    ) {
      const bassIndices = pendingBassIndicesForStep(exhibitionState.step);
      if (bassIndices) {
        const withBass = withBassIndices(rhythmState.currentPattern, bassIndices);
        rhythmState = queuePendingPattern(rhythmState, withBass);
      }
    }
    render();
  });

  // "▶ play the pocket" (EXHIBITION_FLOW.md section 10) — a one-shot reveal
  // that simply holds the already-assembled final pattern in place for a
  // few bars; unlike Act III/IV's reveals, it introduces no new pattern
  // indices, so no queuePendingPattern call accompanies it.
  playPocketButton.addEventListener("click", () => {
    if (playPocketButton.hidden || !canTriggerFullPerformance(exhibitionState)) return;
    exhibitionState = triggerFullPerformance(exhibitionState);
    render();
  });

  // Resizing must not lose Act I state or restart audio — re-render from the
  // existing rhythm/exhibition state rather than resetting anything.
  new ResizeObserver(() => {
    if (stageEl.classList.contains("score-stage-active")) render();
  }).observe(stageEl);

  new ResizeObserver(() => {
    if (laboratoryFlow.classList.contains("laboratory-flow-active")) renderLaboratory();
  }).observe(laboratoryFlow);
}
