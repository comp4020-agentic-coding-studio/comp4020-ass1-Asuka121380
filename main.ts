import { createScheduler, type Scheduler } from "./src/audio-scheduler";
import { createPracticePadVoice } from "./src/audio-voices";
import { annotationForStep, type AnnotationContent } from "./src/annotations";
import {
  ACT1_TARGETS,
  advanceBar,
  selectTarget,
  selectableTargets,
  startExhibition,
  type ExhibitionState,
} from "./src/exhibition-state";
import { prefersReducedMotion, watchReducedMotion } from "./src/motion";
import { renderPulseScore, type NoteBox } from "./src/notation";
import {
  BEAT_ONE_INDEX,
  BEAT_THREE_INDEX,
  applyPendingPattern,
  createEmptyStavePattern,
  createInitialRhythmState,
  queuePendingPattern,
  withAccentsAt,
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
const titleStaffContainer = document.querySelector<HTMLDivElement>(
  '[data-testid="title-staff"]',
);
const playPauseButton = document.querySelector<HTMLButtonElement>(
  '[data-testid="play-pause"]',
);
const muteToggle = document.querySelector<HTMLButtonElement>(
  '[data-testid="mute-toggle"]',
);

if (titleStaffContainer) {
  renderPulseScore(titleStaffContainer, createEmptyStavePattern());
}

if (
  titleRoot &&
  startButton &&
  stage &&
  staffFrameEl &&
  staffContainer &&
  hitTargetsContainer &&
  annotationLayerEl &&
  playPauseButton
) {
  const stageEl = stage;
  const staffFrame = staffFrameEl;
  const staffEl = staffContainer;
  const annotationLayer = annotationLayerEl;
  let rhythmState: RhythmState = createInitialRhythmState();
  let exhibitionState: ExhibitionState = startExhibition();
  let scheduler: Scheduler | null = null;
  let muted = false;
  let currentAnnotationId: AnnotationContent["id"] | null = null;

  function createBeatTarget(index: EighthIndex): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "beat-target";
    button.dataset.testid = `beat-target-${index}`;
    button.setAttribute(
      "aria-label",
      `Accent beat ${index === BEAT_ONE_INDEX ? "1" : "3"}`,
    );
    button.setAttribute("aria-pressed", "false");
    button.disabled = true;
    button.addEventListener("click", () => {
      if (button.disabled) return;
      exhibitionState = selectTarget(exhibitionState, index);
      if (
        exhibitionState.screen === "exhibition" &&
        exhibitionState.step === "queued" &&
        !rhythmState.pendingPattern
      ) {
        const accented = withAccentsAt(rhythmState.currentPattern, ACT1_TARGETS);
        rhythmState = queuePendingPattern(rhythmState, accented);
      }
      render();
    });
    return button;
  }

  const beatTargets = new Map<EighthIndex, HTMLButtonElement>([
    [BEAT_ONE_INDEX, createBeatTarget(BEAT_ONE_INDEX)],
    [BEAT_THREE_INDEX, createBeatTarget(BEAT_THREE_INDEX)],
  ]);
  for (const button of beatTargets.values()) hitTargetsContainer.append(button);

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

  function animateDrawOn(path: SVGPathElement): void {
    const length = path.getTotalLength();
    if (reducedMotion) {
      path.style.transition = "none";
      path.style.strokeDasharray = "";
      path.style.strokeDashoffset = "0";
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

  function renderAnnotationContent(annotation: AnnotationContent | null): void {
    annotationNote.classList.remove(
      "annotation-pos-upper-left",
      "annotation-pos-upper-right",
      "annotation-pos-lower-left",
      "annotation-note-visible",
    );
    annotationNote.replaceChildren();
    if (!annotation) return;

    annotationNote.classList.add(`annotation-pos-${annotation.position}`);
    annotation.lines.forEach((line, index) => {
      if (index > 0) annotationNote.append(document.createElement("br"));
      appendAnnotationLine(annotationNote, line, annotation.underlineWord);
    });
    // Next frame, so the browser registers the pre-fade state before the
    // opacity transition runs.
    requestAnimationFrame(() => annotationNote.classList.add("annotation-note-visible"));
  }

  function positionUnderline(annotation: AnnotationContent): void {
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
    animateDrawOn(underlinePath);
  }

  function positionArrows(
    annotation: AnnotationContent,
    noteBoxes: readonly NoteBox[],
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
      animateDrawOn(path);
    }
  }

  function syncAnnotation(noteBoxes: readonly NoteBox[]): void {
    const annotation = annotationForStep(exhibitionState);
    const changed = (annotation?.id ?? null) !== currentAnnotationId;
    currentAnnotationId = annotation?.id ?? null;

    if (changed) renderAnnotationContent(annotation);

    if (!annotation) {
      underlineSvg.style.display = "none";
      arrowsSvg.style.display = "none";
      return;
    }
    requestAnimationFrame(() => {
      positionUnderline(annotation);
      positionArrows(annotation, noteBoxes);
    });
  }

  function syncBeatTargets(noteBoxes: readonly NoteBox[]): void {
    const selectable = selectableTargets(exhibitionState);
    const selected =
      exhibitionState.screen === "exhibition"
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

  function render(): void {
    const { noteBoxes } = renderPulseScore(staffEl, rhythmState.currentPattern);
    if (exhibitionState.screen === "exhibition") {
      stageEl.dataset.act1Step = exhibitionState.step;
    }
    syncBeatTargets(noteBoxes);
    syncAnnotation(noteBoxes);
  }

  initTitleScreen({
    elements: { root: titleRoot, startButton, stage },
    onActivated(audioContext) {
      const voice = createPracticePadVoice(audioContext);
      render();

      scheduler = createScheduler(audioContext, {
        getRhythmState: () => rhythmState,
        onNoteScheduled(_slotIndex, time, note) {
          if (note.active) voice.trigger(time, note.velocity);
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

      if (muteToggle) {
        muteToggle.disabled = false;
        muteToggle.addEventListener("click", () => {
          muted = !muted;
          voice.masterGain.gain.value = muted ? 0 : 1;
          muteToggle.textContent = muted ? "sound off" : "sound on";
          muteToggle.setAttribute("aria-pressed", String(muted));
        });
      }
    },
  });

  playPauseButton.addEventListener("click", () => {
    if (!scheduler) return;
    if (scheduler.isRunning) {
      scheduler.pause();
      playPauseButton.textContent = "▶ play";
      playPauseButton.setAttribute("aria-pressed", "false");
    } else {
      void scheduler.resume().then(() => {
        playPauseButton.textContent = "⏸ pause";
        playPauseButton.setAttribute("aria-pressed", "true");
      });
    }
  });

  // Resizing must not lose Act I state or restart audio — re-render from the
  // existing rhythm/exhibition state rather than resetting anything.
  new ResizeObserver(() => {
    if (stageEl.classList.contains("score-stage-active")) render();
  }).observe(stageEl);
}
