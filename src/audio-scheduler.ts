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
  // Re-anchors playback to slot 0 against the current clock time without
  // pausing or recreating the scheduler — the laboratory's "restart bar"
  // control (EXHIBITION_FLOW.md section 11), the one place a visitor can
  // snap playback back to the top of the bar mid-performance.
  restart(): void;
  destroy(): void;
  readonly isRunning: boolean;
}

// The scheduler only ever touches these three members. Narrowing the
// parameter to them (rather than the full `AudioContext`) lets tests supply
// a fake clock with a controllable `currentTime` — jsdom has no real
// `AudioContext`, same reasoning as title-screen.ts's injectable
// `createAudioContext` and motion.ts's injectable `matchMedia`. A real
// `AudioContext` still satisfies this type, so callers are unaffected.
export type AudioClock = Pick<AudioContext, "currentTime" | "suspend" | "resume">;

export function createScheduler(
  audioContext: AudioClock,
  callbacks: SchedulerCallbacks,
): Scheduler {
  let currentSlot: EighthIndex = 0;
  let nextNoteTime = 0;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let running = false;
  // start() always begins at slot 0, which is also a bar start — without
  // this flag the very first tick() iteration would fire onBarBoundary
  // before a single note has played, silently eating one bar's worth of
  // Act I's "two full bars of listening" pacing.
  let awaitingFirstBar = true;

  function tick(): void {
    while (nextNoteTime < audioContext.currentTime + SCHEDULE_AHEAD_SECONDS) {
      // Fire the boundary hook before reading the pattern for this slot, so a
      // pattern queued via onBarBoundary is the one this bar actually plays.
      if (isBarStart(currentSlot)) {
        if (awaitingFirstBar) {
          awaitingFirstBar = false;
        } else {
          callbacks.onBarBoundary(nextNoteTime);
        }
      }

      const pattern = callbacks.getRhythmState().currentPattern;
      // Every voice in the pattern gets its own onNoteScheduled call for this
      // slot — a single-voice pattern (Act I/II) fires once, a drum-kit
      // pattern (Act III onward) fires once per instrument, each carrying its
      // own NoteEvent so the caller can route it to the right instrument.
      for (const voice of pattern.voices) {
        const slot = voice.slots[currentSlot];
        if (slot) callbacks.onNoteScheduled(currentSlot, nextNoteTime, slot);
      }

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
      awaitingFirstBar = true;
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
    restart() {
      // Same reset start() performs, minus the timer (re)start — the
      // existing lookahead loop (running or not) picks up from slot 0 on its
      // own next tick, and awaitingFirstBar again swallows the immediate
      // slot-0 boundary so restarting never fires a spurious onBarBoundary.
      currentSlot = 0;
      nextNoteTime = audioContext.currentTime;
      awaitingFirstBar = true;
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
