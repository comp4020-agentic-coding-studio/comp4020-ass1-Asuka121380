import { describe, expect, it } from "vitest";
import { audioTimeToPerformanceTime, type AudioSyncClock } from "./audio-clock-sync";

describe("audioTimeToPerformanceTime", () => {
  it("maps a future context time via getOutputTimestamp when available", () => {
    const clock: AudioSyncClock = {
      currentTime: 10,
      getOutputTimestamp: () => ({ contextTime: 10, performanceTime: 1000 }),
    };
    // 0.25s ahead on the audio clock should land 250ms ahead on the wall clock.
    expect(audioTimeToPerformanceTime(clock, 10.25)).toBeCloseTo(1250, 5);
  });

  it("falls back to outputLatency when getOutputTimestamp is unavailable", () => {
    const clock: AudioSyncClock = { currentTime: 5, outputLatency: 0.02 };
    const now = () => 2000;
    // 0.1s until the target time, plus 20ms of reported output latency.
    expect(audioTimeToPerformanceTime(clock, 5.1, now)).toBeCloseTo(2120, 5);
  });

  it("falls back to baseLatency when outputLatency is unavailable", () => {
    const clock: AudioSyncClock = { currentTime: 5, baseLatency: 0.01 };
    const now = () => 2000;
    expect(audioTimeToPerformanceTime(clock, 5.1, now)).toBeCloseTo(2110, 5);
  });

  it("assumes zero latency when neither the timestamp nor a latency figure is reported", () => {
    const clock: AudioSyncClock = { currentTime: 5 };
    const now = () => 2000;
    expect(audioTimeToPerformanceTime(clock, 5.1, now)).toBeCloseTo(2100, 5);
  });
});
