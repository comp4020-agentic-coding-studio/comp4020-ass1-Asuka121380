// Phase-one practice-pad voice: a short filtered noise burst with a fast
// decay envelope, standing in for a bundled sample per CLAUDE.md's
// documented deviation (see "Deviation: synthesized percussion voice").
const NOISE_DURATION_SECONDS = 0.05;
const ENVELOPE_ATTACK_SECONDS = 0.001;
const ENVELOPE_DECAY_SECONDS = 0.045;
// Tuned high for a dry rim-click character rather than a full drum tone.
const FILTER_FREQUENCY_HZ = 3000;
const FILTER_Q = 0.9;
const BASE_HIT_GAIN = 0.5;

export interface PracticePadVoice {
  readonly masterGain: GainNode;
  trigger(time: number, velocity: number): void;
}

export function createPracticePadVoice(
  audioContext: AudioContext,
): PracticePadVoice {
  const buffer = createNoiseBuffer(audioContext);
  const masterGain = audioContext.createGain();
  masterGain.gain.value = 1;
  masterGain.connect(audioContext.destination);

  function trigger(time: number, velocity: number): void {
    const source = audioContext.createBufferSource();
    source.buffer = buffer;

    const filter = audioContext.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = FILTER_FREQUENCY_HZ;
    filter.Q.value = FILTER_Q;

    const envelope = audioContext.createGain();
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(
      velocity * BASE_HIT_GAIN,
      time + ENVELOPE_ATTACK_SECONDS,
    );
    envelope.gain.exponentialRampToValueAtTime(
      0.0001,
      time + ENVELOPE_ATTACK_SECONDS + ENVELOPE_DECAY_SECONDS,
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
