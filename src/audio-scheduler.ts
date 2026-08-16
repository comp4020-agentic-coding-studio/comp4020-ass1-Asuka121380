import type { EighthIndex, NoteEvent, RhythmState } from "./rhythm-model";
import { isBarStart, nextSlotIndex, secondsPerEighthNote } from "./scheduler-math";

// Classic look-ahead scheduler: wake on an ordinary timer, but schedule every
// note against AudioContext.currentTime so audio timing never depends on
// setTimeout's own (unreliable) precision. See CLAUDE.md.
const SCHEDULE_AHEAD_SECONDS = 0.1;
const LOOKAHEAD_INTERVAL_MS = 25;

export interface SchedulerCallbacks {
  getRhythmState(): RhythmState;
  onNoteScheduled(slotIndex: EighthIndex, time: number, note: NoteEvent): void;
  onBarBoundary(time: number): void;
}

export interface Scheduler {
  start(): void;
  pause(): void;
  resume(): Promise<void>;
  destroy(): void;
  readonly isRunning: boolean;
}

export function createScheduler(
  audioContext: AudioContext,
  callbacks: SchedulerCallbacks,
): Scheduler {
  let currentSlot: EighthIndex = 0;
  let nextNoteTime = 0;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let running = false;

  function tick(): void {
    while (nextNoteTime < audioContext.currentTime + SCHEDULE_AHEAD_SECONDS) {
      // Fire the boundary hook before reading the pattern for this slot, so a
      // pattern queued via onBarBoundary is the one this bar actually plays.
      if (isBarStart(currentSlot)) callbacks.onBarBoundary(nextNoteTime);

      const pattern = callbacks.getRhythmState().currentPattern;
      const slot = pattern.voices[0]?.slots[currentSlot];
      if (slot) callbacks.onNoteScheduled(currentSlot, nextNoteTime, slot);

      nextNoteTime += secondsPerEighthNote(pattern.tempoBpm);
      currentSlot = nextSlotIndex(currentSlot);
    }
    timerId = setTimeout(tick, LOOKAHEAD_INTERVAL_MS);
  }

  return {
    start() {
      if (running) return;
      running = true;
      currentSlot = 0;
      nextNoteTime = audioContext.currentTime;
      tick();
    },
    pause() {
      if (!running) return;
      running = false;
      if (timerId !== null) clearTimeout(timerId);
      timerId = null;
      // Suspending freezes currentTime itself, so nextNoteTime is still
      // valid relative to the clock once resume() continues it.
      void audioContext.suspend();
    },
    async resume() {
      if (running) return;
      running = true;
      await audioContext.resume();
      tick();
    },
    destroy() {
      running = false;
      if (timerId !== null) clearTimeout(timerId);
      timerId = null;
    },
    get isRunning() {
      return running;
    },
  };
}
