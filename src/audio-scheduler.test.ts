import { afterEach, describe, expect, it, vi } from "vitest";
import { createScheduler, type AudioClock } from "./audio-scheduler";
import { createInitialRhythmState } from "./rhythm-model";

function fakeClock(): AudioClock & { currentTime: number } {
  return {
    currentTime: 0,
    suspend: vi.fn(async () => {}),
    resume: vi.fn(async () => {}),
  };
}

describe("createScheduler bar boundaries", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not fire onBarBoundary before a first bar has actually played", () => {
    vi.useFakeTimers();
    const clock = fakeClock();
    const onBarBoundary = vi.fn();
    const scheduler = createScheduler(clock, {
      getRhythmState: () => createInitialRhythmState(),
      onNoteScheduled: () => {},
      onBarBoundary,
    });

    scheduler.start();
    // start() itself synchronously reaches bar-start slot 0 — that must not
    // count as a completed bar.
    expect(onBarBoundary).not.toHaveBeenCalled();

    // One full bar at 96bpm is 8 eighth notes = 2.5s. Jump the fake clock
    // there and let the lookahead timer catch up.
    clock.currentTime = 2.5;
    vi.advanceTimersByTime(25);
    expect(onBarBoundary).toHaveBeenCalledTimes(1);
  });

  it("fires exactly once per completed bar thereafter", () => {
    vi.useFakeTimers();
    const clock = fakeClock();
    const onBarBoundary = vi.fn();
    const scheduler = createScheduler(clock, {
      getRhythmState: () => createInitialRhythmState(),
      onNoteScheduled: () => {},
      onBarBoundary,
    });

    scheduler.start();
    clock.currentTime = 2.5 * 4;
    vi.advanceTimersByTime(25);
    expect(onBarBoundary).toHaveBeenCalledTimes(4);
  });
});
