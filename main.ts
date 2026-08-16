import { audioTimeToPerformanceTime } from "./src/audio-clock-sync";
import { createScheduler, type Scheduler } from "./src/audio-scheduler";
import { createDrumKitVoices } from "./src/audio-voices";
import { annotationForStep, type AnnotationContent } from "./src/annotations";
import {
  ACT1_TARGETS,
  advanceBar,
  canFlipAccents,
  canTriggerCompare332,
  canTriggerCompareBasic,
  canTriggerOrchestrate,
  isFlipControlVisible,
  pendingAccentTargetsForStep,
  pendingKickIndicesForStep,
  returnToTitle,
  selectTarget,
  selectableTargets,
  startExhibition,
  triggerCompare332,
  triggerCompareBasic,
  triggerFlip,
  triggerOrchestrate,
  type ActId,
  type ExhibitionState,
} from "./src/exhibition-state";
import { prefersReducedMotion, watchReducedMotion } from "./src/motion";
import { renderPulseScore, type NoteBox } from "./src/notation";
import {
  BASIC_KICK_INDICES,
  BEAT_FOUR_INDEX,
  BEAT_ONE_INDEX,
  BEAT_THREE_INDEX,
  BEAT_TWO_INDEX,
  EIGHTH_LABELS,
  OFFBEAT_AFTER_BEAT_TWO_INDEX,
  applyPendingPattern,
  createDrumKitPattern,
  createInitialRhythmState,
  queuePendingPattern,
  withAccentsAt,
  withKickIndices,
  type EighthIndex,
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
  compare332ButtonEl
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
  let rhythmState: RhythmState = createInitialRhythmState();
  let exhibitionState: ExhibitionState = startExhibition();
  let scheduler: Scheduler | null = null;
  let currentAudioContext: AudioContext | null = null;
  let activeVoice: ReturnType<typeof createDrumKitVoices> | null = null;
  let muted = false;
  let currentAnnotationId: AnnotationContent["id"] | null = null;
  let latestNoteBoxes: readonly NoteBox[] = [];
  const cursorTimeouts = new Set<ReturnType<typeof setTimeout>>();
  let annotationFadeTimeoutId: ReturnType<typeof setTimeout> | null = null;
  // Kept in sync with .annotation-note's CSS transition duration in
  // styles.css (~600-900ms band) — the swap-in is scheduled to happen only
  // once the fade-out has actually finished, not on a guessed delay.
  const ANNOTATION_FADE_MS = 700;

  function beatTargetLabel(index: EighthIndex): string {
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
    button.setAttribute("aria-label", beatTargetLabel(index));
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

  // Annotation-3's hand-written arc from the kick's old beat-3 placement to
  // the offbeat after beat 2 — a single curved stroke below the staff.
  const arcSvg = document.createElementNS(SVG_NS, "svg");
  arcSvg.setAttribute("class", "annotation-arc");
  arcSvg.style.display = "none";
  const arcPath = document.createElementNS(SVG_NS, "path");
  arcPath.setAttribute("class", "annotation-arc-path");
  arcSvg.append(arcPath);
  staffFrame.append(arcSvg);

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
  ): void {
    if (!underlineWord || !line.includes(underlineWord)) {
      target.append(document.createTextNode(line));
      return;
    }
    const [before, after] = line.split(underlineWord);
    target.append(document.createTextNode(before));
    const span = document.createElement("span");
    span.className = "annotation-underline-word";
    span.textContent = underlineWord;
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
        appendAnnotationLine(small, line, annotation.underlineWord);
      } else {
        appendAnnotationLine(target, line, annotation.underlineWord);
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

  // Annotation-3's arc from the kick's old placement to its new offbeat,
  // drawn below the staff as a single downward-bulging curve.
  function positionArc(
    annotation: AnnotationContent,
    noteBoxes: readonly NoteBox[],
    drawOn: boolean,
  ): void {
    const fromBox =
      annotation.arcFrom !== undefined ? noteBoxes[annotation.arcFrom] : undefined;
    const toBox = annotation.arcTo !== undefined ? noteBoxes[annotation.arcTo] : undefined;
    if (!fromBox || !toBox) {
      arcSvg.style.display = "none";
      return;
    }
    const w = staffFrame.clientWidth;
    const h = staffFrame.clientHeight;
    arcSvg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    arcSvg.style.display = "block";

    const startX = fromBox.x + fromBox.w / 2;
    const startY = fromBox.y + fromBox.h;
    const endX = toBox.x + toBox.w / 2;
    const endY = toBox.y + toBox.h;
    const controlX = (startX + endX) / 2;
    const controlY = Math.max(startY, endY) + 24;
    arcPath.setAttribute("d", `M${startX},${startY} Q${controlX},${controlY} ${endX},${endY}`);
    if (drawOn) animateDrawOn(arcPath);
    else setPathFullyDrawn(arcPath);
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
      return;
    }
    // Uses the latest known note layout rather than whatever was passed in
    // when the fade-out started — a resize during the wait must not leave
    // the arrows pointing at stale coordinates.
    requestAnimationFrame(() => {
      positionUnderline(annotation, true);
      positionArrows(annotation, latestNoteBoxes, true);
      positionGroupBraces(annotation, latestNoteBoxes, true);
      positionArc(annotation, latestNoteBoxes, true);
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
          positionArc(annotation, noteBoxes, false);
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

  function render(): void {
    const { noteBoxes } = renderPulseScore(staffEl, rhythmState.currentPattern);
    latestNoteBoxes = noteBoxes;
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
        getRhythmState: () => rhythmState,
        onNoteScheduled(slotIndex, time, note) {
          if (note.active) voice.trigger(note.instrument, time, note.velocity, note.accent);
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
          exhibitionState = advanceBar(exhibitionState);
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
      activeVoice.masterGain.gain.value = muted ? 0 : 1;
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
    } else {
      void scheduler.resume().then(() => {
        playPauseButton.textContent = "⏸ pause";
        playPauseButton.setAttribute("aria-pressed", "true");
      });
    }
  };

  playPauseButton.addEventListener("click", togglePlayPause);

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
    if (exhibitionState.screen !== "exhibition") return;
    if (focusOwnsSpaceKey()) return;
    event.preventDefault();
    togglePlayPause();
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
  backNavButton.addEventListener("click", () => {
    clearCursorTimeouts();
    resetAnnotationDisplay();
    cursorEl.classList.remove("playback-cursor-active");

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

  // Resizing must not lose Act I state or restart audio — re-render from the
  // existing rhythm/exhibition state rather than resetting anything.
  new ResizeObserver(() => {
    if (stageEl.classList.contains("score-stage-active")) render();
  }).observe(stageEl);
}
