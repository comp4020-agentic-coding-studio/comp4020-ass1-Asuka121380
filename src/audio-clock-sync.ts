// Maps a time on the audio clock (AudioContext.currentTime) to the
// corresponding wall-clock time (performance.now()) so a visual cursor can be
// scheduled to arrive when the sound is actually audible, not merely when it
// was scheduled — see CLAUDE.md's "AudioContext.currentTime is the clock"
// rule and this project's PROCESS.md review-fix entry for why a bare
// `(time - currentTime) * 1000` delay reads as late.
export type AudioSyncClock = Pick<AudioContext, "currentTime"> & {
  readonly outputLatency?: number;
  readonly baseLatency?: number;
  getOutputTimestamp?: () => AudioTimestamp;
};

export function audioTimeToPerformanceTime(
  clock: AudioSyncClock,
  targetContextTime: number,
  now: () => number = () => performance.now(),
): number {
  const timestamp = clock.getOutputTimestamp?.();
  if (
    timestamp &&
    timestamp.contextTime !== undefined &&
    timestamp.performanceTime !== undefined
  ) {
    const elapsedContextSeconds = targetContextTime - timestamp.contextTime;
    return timestamp.performanceTime + elapsedContextSeconds * 1000;
  }

  // Older browsers (e.g. Safari) may lack getOutputTimestamp entirely — fall
  // back to whichever latency figure the platform reports, or 0 if neither is
  // available, rather than inventing a fudge constant.
  const latencySeconds = clock.outputLatency ?? clock.baseLatency ?? 0;
  const elapsedContextSeconds = targetContextTime - clock.currentTime;
  return now() + (elapsedContextSeconds + latencySeconds) * 1000;
}
