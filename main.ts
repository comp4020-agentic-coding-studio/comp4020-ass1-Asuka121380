import { createScheduler, type Scheduler } from "./src/audio-scheduler";
import { createPracticePadVoice } from "./src/audio-voices";
import {
  advanceBar,
  startExhibition,
  type ExhibitionState,
} from "./src/exhibition-state";
import { renderPulseScore } from "./src/notation";
import {
  applyPendingPattern,
  createEmptyStavePattern,
  createInitialRhythmState,
  type RhythmState,
} from "./src/rhythm-model";
import { initTitleScreen } from "./src/title-screen";

const titleRoot = document.querySelector<HTMLElement>('[data-testid="title-screen"]');
const startButton = document.querySelector<HTMLButtonElement>(
  '[data-testid="start-button"]',
);
const stage = document.querySelector<HTMLElement>('[data-testid="score-stage"]');
const staffContainer = document.querySelector<HTMLDivElement>('[data-testid="staff"]');
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

if (titleRoot && startButton && stage && staffContainer && playPauseButton) {
  const stageEl = stage;
  const staffEl = staffContainer;
  let rhythmState: RhythmState = createInitialRhythmState();
  let exhibitionState: ExhibitionState = startExhibition();
  let scheduler: Scheduler | null = null;
  let muted = false;

  function render(): void {
    renderPulseScore(staffEl, rhythmState.currentPattern);
    // Exposed for Milestone 5's annotation layer and for manual verification
    // in devtools — not yet read by any styling.
    if (exhibitionState.screen === "exhibition") {
      stageEl.dataset.act1Step = exhibitionState.step;
    }
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
