// Phase-one practice-pad voice: a short filtered noise burst with a fast
// decay envelope, standing in for a bundled sample per CLAUDE.md's
// documented deviation (see "Deviation: synthesized percussion voice").
const NOISE_DURATION_SECONDS = 0.05;
const ENVELOPE_ATTACK_SECONDS = 0.001;
// An accented hit gets a touch shorter attack — firmer, less rounded — on
// top of the higher velocity/filter values below, so accents read as a
// distinct strike, not just the same hit turned up.
const ACCENT_ENVELOPE_ATTACK_SECONDS = 0.0006;
const ENVELOPE_DECAY_SECONDS = 0.045;
// Tuned high for a dry rim-click character rather than a full drum tone.
const FILTER_FREQUENCY_HZ = 3000;
const ACCENT_FILTER_FREQUENCY_HZ = 3600;
const FILTER_Q = 0.9;
const BASE_HIT_GAIN = 0.5;
// Ceiling headroom for the shared limiter — see the DynamicsCompressorNode
// below, added once accent gain was raised enough to risk clipping.
const LIMITER_THRESHOLD_DB = -6;
const LIMITER_KNEE_DB = 6;
const LIMITER_RATIO = 12;
const LIMITER_ATTACK_SECONDS = 0.003;
const LIMITER_RELEASE_SECONDS = 0.1;

export interface PracticePadVoice {
  readonly masterGain: GainNode;
  trigger(time: number, velocity: number, accent?: boolean): void;
}

export function createPracticePadVoice(
  audioContext: AudioContext,
): PracticePadVoice {
  const buffer = createNoiseBuffer(audioContext);
  const masterGain = audioContext.createGain();
  masterGain.gain.value = 1;

  // Protects the master output from clipping now that accented hits carry
  // meaningfully more gain than before — a peak limiter, not a tone shaper.
  const limiter = audioContext.createDynamicsCompressor();
  limiter.threshold.value = LIMITER_THRESHOLD_DB;
  limiter.knee.value = LIMITER_KNEE_DB;
  limiter.ratio.value = LIMITER_RATIO;
  limiter.attack.value = LIMITER_ATTACK_SECONDS;
  limiter.release.value = LIMITER_RELEASE_SECONDS;

  masterGain.connect(limiter);
  limiter.connect(audioContext.destination);

  function trigger(time: number, velocity: number, accent = false): void {
    const source = audioContext.createBufferSource();
    source.buffer = buffer;

    const filter = audioContext.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = accent ? ACCENT_FILTER_FREQUENCY_HZ : FILTER_FREQUENCY_HZ;
    filter.Q.value = FILTER_Q;

    const attackSeconds = accent
      ? ACCENT_ENVELOPE_ATTACK_SECONDS
      : ENVELOPE_ATTACK_SECONDS;

    const envelope = audioContext.createGain();
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(
      velocity * BASE_HIT_GAIN,
      time + attackSeconds,
    );
    envelope.gain.exponentialRampToValueAtTime(
      0.0001,
      time + attackSeconds + ENVELOPE_DECAY_SECONDS,
    );

    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(masterGain);

    source.start(time);
    source.stop(time + NOISE_DURATION_SECONDS);
  }

  return { masterGain, trigger };
}

function createNoiseBuffer(audioContext: AudioContext): AudioBuffer {
  const frameCount = Math.max(
    1,
    Math.floor(audioContext.sampleRate * NOISE_DURATION_SECONDS),
  );
  const buffer = audioContext.createBuffer(1, frameCount, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}
