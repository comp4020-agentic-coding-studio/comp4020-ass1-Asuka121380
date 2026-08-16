import type { Instrument } from "./rhythm-model";

// Phase-one practice-pad voice: a short filtered noise burst with a fast
// decay envelope, standing in for a bundled sample per CLAUDE.md's
// documented deviation (see "Deviation: synthesized percussion voice"). Act
// III's hi-hat/snare/kick voices continue that same deviation rather than
// switching to bundled samples — each is a distinct instance of the same
// noise-burst/oscillator -> filter -> envelope -> shared bus architecture,
// tuned per instrument, not a different technique.
const PRACTICE_PAD_NOISE_DURATION_SECONDS = 0.05;
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

// Closed hi-hat: a very short, bright noise burst — tight and ticking rather
// than a full drum tone, so it reads as "keeping time" underneath the snare
// and kick.
const HIHAT_NOISE_DURATION_SECONDS = 0.035;
const HIHAT_FILTER_FREQUENCY_HZ = 9000;
const HIHAT_FILTER_Q = 0.7;
const HIHAT_ENVELOPE_DECAY_SECONDS = 0.03;
const HIHAT_HIT_GAIN = 0.35;

// Snare: a filtered noise burst (the "buzz") layered with a short low-tone
// body (the shell) — the classic two-layer synthesised snare recipe.
const SNARE_NOISE_DURATION_SECONDS = 0.12;
const SNARE_FILTER_FREQUENCY_HZ = 1800;
const SNARE_FILTER_Q = 1;
const SNARE_NOISE_DECAY_SECONDS = 0.11;
const SNARE_NOISE_GAIN = 0.45;
const SNARE_BODY_FREQUENCY_HZ = 180;
const SNARE_BODY_DECAY_SECONDS = 0.05;
const SNARE_BODY_GAIN = 0.3;

// Kick: a sine oscillator with a fast downward pitch sweep (the classic
// synthesised-808-style "thump") plus an amplitude envelope, no noise layer.
const KICK_START_FREQUENCY_HZ = 150;
const KICK_END_FREQUENCY_HZ = 45;
const KICK_PITCH_SWEEP_SECONDS = 0.045;
const KICK_DECAY_SECONDS = 0.22;
const KICK_HIT_GAIN = 0.9;

// Bass (Act IV, EXHIBITION_FLOW.md section 9): a sustained sine tone at a
// fixed pitch, no pitch sweep — distinct from the kick's short percussive
// thump so the two read as separate instruments in conversation rather than
// a doubled kick. A gentle lowpass keeps the tone warm rather than buzzy.
const BASS_FREQUENCY_HZ = 82;
const BASS_FILTER_FREQUENCY_HZ = 400;
const BASS_DECAY_SECONDS = 0.35;
const BASS_HIT_GAIN = 0.8;

export interface PracticePadVoice {
  readonly masterGain: GainNode;
  trigger(time: number, velocity: number, accent?: boolean): void;
}

export function createPracticePadVoice(
  audioContext: AudioContext,
): PracticePadVoice {
  const buffer = createNoiseBuffer(audioContext, PRACTICE_PAD_NOISE_DURATION_SECONDS);
  const masterGain = audioContext.createGain();
  masterGain.gain.value = 1;

  const limiter = createLimiter(audioContext);
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
    source.stop(time + PRACTICE_PAD_NOISE_DURATION_SECONDS);
  }

  return { masterGain, trigger };
}

// Act III's real drum kit (EXHIBITION_FLOW.md section 8): one shared output
// bus (mute toggle + limiter) with a distinct synthesised voice per
// instrument, dispatched by name so the scheduler's per-voice NoteEvents
// (rhythm-model.ts's `instrument` field) route straight through.
export interface DrumKitVoices {
  readonly masterGain: GainNode;
  trigger(instrument: Instrument, time: number, velocity: number, accent?: boolean): void;
}

export function createDrumKitVoices(audioContext: AudioContext): DrumKitVoices {
  const masterGain = audioContext.createGain();
  masterGain.gain.value = 1;

  const limiter = createLimiter(audioContext);
  masterGain.connect(limiter);
  limiter.connect(audioContext.destination);

  const practicePadBuffer = createNoiseBuffer(
    audioContext,
    PRACTICE_PAD_NOISE_DURATION_SECONDS,
  );
  const hihatBuffer = createNoiseBuffer(audioContext, HIHAT_NOISE_DURATION_SECONDS);
  const snareBuffer = createNoiseBuffer(audioContext, SNARE_NOISE_DURATION_SECONDS);

  function triggerPracticePad(time: number, velocity: number, accent: boolean): void {
    const source = audioContext.createBufferSource();
    source.buffer = practicePadBuffer;

    const filter = audioContext.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = accent ? ACCENT_FILTER_FREQUENCY_HZ : FILTER_FREQUENCY_HZ;
    filter.Q.value = FILTER_Q;

    const attackSeconds = accent
      ? ACCENT_ENVELOPE_ATTACK_SECONDS
      : ENVELOPE_ATTACK_SECONDS;

    const envelope = audioContext.createGain();
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(velocity * BASE_HIT_GAIN, time + attackSeconds);
    envelope.gain.exponentialRampToValueAtTime(
      0.0001,
      time + attackSeconds + ENVELOPE_DECAY_SECONDS,
    );

    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(masterGain);

    source.start(time);
    source.stop(time + PRACTICE_PAD_NOISE_DURATION_SECONDS);
  }

  function triggerHiHat(time: number, velocity: number): void {
    const source = audioContext.createBufferSource();
    source.buffer = hihatBuffer;

    const filter = audioContext.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = HIHAT_FILTER_FREQUENCY_HZ;
    filter.Q.value = HIHAT_FILTER_Q;

    const envelope = audioContext.createGain();
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(
      velocity * HIHAT_HIT_GAIN,
      time + ENVELOPE_ATTACK_SECONDS,
    );
    envelope.gain.exponentialRampToValueAtTime(
      0.0001,
      time + ENVELOPE_ATTACK_SECONDS + HIHAT_ENVELOPE_DECAY_SECONDS,
    );

    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(masterGain);

    source.start(time);
    source.stop(time + HIHAT_NOISE_DURATION_SECONDS);
  }

  function triggerSnare(time: number, velocity: number): void {
    const noiseSource = audioContext.createBufferSource();
    noiseSource.buffer = snareBuffer;

    const noiseFilter = audioContext.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = SNARE_FILTER_FREQUENCY_HZ;
    noiseFilter.Q.value = SNARE_FILTER_Q;

    const noiseEnvelope = audioContext.createGain();
    noiseEnvelope.gain.setValueAtTime(0, time);
    noiseEnvelope.gain.linearRampToValueAtTime(
      velocity * SNARE_NOISE_GAIN,
      time + ENVELOPE_ATTACK_SECONDS,
    );
    noiseEnvelope.gain.exponentialRampToValueAtTime(
      0.0001,
      time + ENVELOPE_ATTACK_SECONDS + SNARE_NOISE_DECAY_SECONDS,
    );

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseEnvelope);
    noiseEnvelope.connect(masterGain);

    noiseSource.start(time);
    noiseSource.stop(time + SNARE_NOISE_DURATION_SECONDS);

    const body = audioContext.createOscillator();
    body.type = "triangle";
    body.frequency.setValueAtTime(SNARE_BODY_FREQUENCY_HZ, time);

    const bodyEnvelope = audioContext.createGain();
    bodyEnvelope.gain.setValueAtTime(0, time);
    bodyEnvelope.gain.linearRampToValueAtTime(
      velocity * SNARE_BODY_GAIN,
      time + ENVELOPE_ATTACK_SECONDS,
    );
    bodyEnvelope.gain.exponentialRampToValueAtTime(
      0.0001,
      time + ENVELOPE_ATTACK_SECONDS + SNARE_BODY_DECAY_SECONDS,
    );

    body.connect(bodyEnvelope);
    bodyEnvelope.connect(masterGain);

    body.start(time);
    body.stop(time + SNARE_BODY_DECAY_SECONDS + ENVELOPE_ATTACK_SECONDS);
  }

  function triggerKick(time: number, velocity: number): void {
    const oscillator = audioContext.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(KICK_START_FREQUENCY_HZ, time);
    oscillator.frequency.exponentialRampToValueAtTime(
      KICK_END_FREQUENCY_HZ,
      time + KICK_PITCH_SWEEP_SECONDS,
    );

    const envelope = audioContext.createGain();
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(
      velocity * KICK_HIT_GAIN,
      time + ENVELOPE_ATTACK_SECONDS,
    );
    envelope.gain.exponentialRampToValueAtTime(
      0.0001,
      time + ENVELOPE_ATTACK_SECONDS + KICK_DECAY_SECONDS,
    );

    oscillator.connect(envelope);
    envelope.connect(masterGain);

    oscillator.start(time);
    oscillator.stop(time + KICK_DECAY_SECONDS + ENVELOPE_ATTACK_SECONDS);
  }

  function triggerBass(time: number, velocity: number): void {
    const oscillator = audioContext.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(BASS_FREQUENCY_HZ, time);

    const filter = audioContext.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = BASS_FILTER_FREQUENCY_HZ;

    const envelope = audioContext.createGain();
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(
      velocity * BASS_HIT_GAIN,
      time + ENVELOPE_ATTACK_SECONDS,
    );
    envelope.gain.exponentialRampToValueAtTime(
      0.0001,
      time + ENVELOPE_ATTACK_SECONDS + BASS_DECAY_SECONDS,
    );

    oscillator.connect(filter);
    filter.connect(envelope);
    envelope.connect(masterGain);

    oscillator.start(time);
    oscillator.stop(time + BASS_DECAY_SECONDS + ENVELOPE_ATTACK_SECONDS);
  }

  function trigger(
    instrument: Instrument,
    time: number,
    velocity: number,
    accent = false,
  ): void {
    switch (instrument) {
      case "practice-pad":
        triggerPracticePad(time, velocity, accent);
        return;
      case "hihat-closed":
        triggerHiHat(time, velocity);
        return;
      case "snare":
        triggerSnare(time, velocity);
        return;
      case "kick":
        triggerKick(time, velocity);
        return;
      case "bass":
        triggerBass(time, velocity);
        return;
    }
  }

  return { masterGain, trigger };
}

function createLimiter(audioContext: AudioContext): DynamicsCompressorNode {
  // Protects the master output from clipping once several voices can land on
  // the same eighth-note slot simultaneously (Act III onward) — a peak
  // limiter, not a tone shaper.
  const limiter = audioContext.createDynamicsCompressor();
  limiter.threshold.value = LIMITER_THRESHOLD_DB;
  limiter.knee.value = LIMITER_KNEE_DB;
  limiter.ratio.value = LIMITER_RATIO;
  limiter.attack.value = LIMITER_ATTACK_SECONDS;
  limiter.release.value = LIMITER_RELEASE_SECONDS;
  return limiter;
}

function createNoiseBuffer(
  audioContext: AudioContext,
  durationSeconds: number,
): AudioBuffer {
  const frameCount = Math.max(1, Math.floor(audioContext.sampleRate * durationSeconds));
  const buffer = audioContext.createBuffer(1, frameCount, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}
