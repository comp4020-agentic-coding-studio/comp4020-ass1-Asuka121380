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

  it("restart() re-anchors to slot 0 without firing a spurious boundary or requiring a fresh start", () => {
    vi.useFakeTimers();
    const clock = fakeClock();
    const onBarBoundary = vi.fn();
    const slotsSeen: number[] = [];
    const scheduler = createScheduler(clock, {
      getRhythmState: () => createInitialRhythmState(),
      onNoteScheduled: (slotIndex) => slotsSeen.push(slotIndex),
      onBarBoundary,
    });

    scheduler.start();
    clock.currentTime = 2.5 * 1.5; // partway through the second bar
    vi.advanceTimersByTime(25);
    expect(onBarBoundary).toHaveBeenCalledTimes(1);

    slotsSeen.length = 0;
    scheduler.restart();
    // restart() doesn't advance the clock itself — the next lookahead tick
    // schedules starting from slot 0 again at the current clock time.
    vi.advanceTimersByTime(25);
    expect(slotsSeen[0]).toBe(0);
    // The immediate slot-0 landing must not count as a completed bar.
    expect(onBarBoundary).toHaveBeenCalledTimes(1);
  });
});
