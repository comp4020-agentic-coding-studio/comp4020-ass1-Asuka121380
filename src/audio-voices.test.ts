import { describe, expect, it, vi } from "vitest";
import { createDrumKitVoices } from "./audio-voices";

// audio-voices.ts talks to the real Web Audio API, which jsdom doesn't
// implement — a minimal fake AudioContext lets these tests inspect exactly
// what each trigger() call configures (oscillator type, frequency, filter,
// envelope timing) without needing a real browser's audio graph.
function createFakeAudioParam() {
  return {
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
}

function createFakeAudioContext() {
  const oscillators: ReturnType<typeof createFakeOscillator>[] = [];
  const filters: ReturnType<typeof createFakeFilter>[] = [];
  const gains: ReturnType<typeof createFakeGain>[] = [];

  function createFakeOscillator() {
    const node = {
      type: "sine" as OscillatorType,
      frequency: createFakeAudioParam(),
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    return node;
  }

  function createFakeFilter() {
    const node = {
      type: "lowpass" as BiquadFilterType,
      frequency: createFakeAudioParam(),
      Q: createFakeAudioParam(),
      connect: vi.fn(),
    };
    return node;
  }

  function createFakeGain() {
    const node = { gain: createFakeAudioParam(), connect: vi.fn() };
    return node;
  }

  const context = {
    sampleRate: 44100,
    destination: {},
    createBuffer: vi.fn((_channels: number, length: number) => {
      const data = new Float32Array(length);
      return { getChannelData: () => data };
    }),
    createBufferSource: vi.fn(() => ({
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    })),
    createBiquadFilter: vi.fn(() => {
      const node = createFakeFilter();
      filters.push(node);
      return node;
    }),
    createGain: vi.fn(() => {
      const node = createFakeGain();
      gains.push(node);
      return node;
    }),
    createOscillator: vi.fn(() => {
      const node = createFakeOscillator();
      oscillators.push(node);
      return node;
    }),
    createDynamicsCompressor: vi.fn(() => ({
      threshold: createFakeAudioParam(),
      knee: createFakeAudioParam(),
      ratio: createFakeAudioParam(),
      attack: createFakeAudioParam(),
      release: createFakeAudioParam(),
      connect: vi.fn(),
    })),
  };

  return {
    context: context as unknown as AudioContext,
    oscillators,
    filters,
    gains,
  };
}

describe("audio-voices — bass vs. kick distinction", () => {
  it("plays the bass at accurate C3 (~130.81 Hz), not the previous 82 Hz", () => {
    const { context, oscillators } = createFakeAudioContext();
    createDrumKitVoices(context).trigger("bass", 0, 1);

    expect(oscillators.length).toBe(1);
    const [frequency] = oscillators[0].frequency.setValueAtTime.mock.calls[0];
    expect(frequency).toBeCloseTo(130.8128, 3);
  });

  it("uses a stable triangle oscillator for the bass, with no pitch sweep", () => {
    const { context, oscillators } = createFakeAudioContext();
    createDrumKitVoices(context).trigger("bass", 0, 1);

    expect(oscillators[0].type).toBe("triangle");
    expect(oscillators[0].frequency.exponentialRampToValueAtTime).not.toHaveBeenCalled();
  });

  it("still sweeps the kick's pitch downward on a sine wave, unlike the bass", () => {
    const { context, oscillators } = createFakeAudioContext();
    createDrumKitVoices(context).trigger("kick", 0, 1);

    expect(oscillators[0].type).toBe("sine");
    expect(oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(150, 0);
    expect(oscillators[0].frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(
      45,
      expect.any(Number),
    );
  });

  it("routes kick and bass through independent oscillators and independent filter graphs", () => {
    const { context, oscillators, filters } = createFakeAudioContext();
    const voices = createDrumKitVoices(context);

    voices.trigger("kick", 0, 1);
    voices.trigger("bass", 0, 1);

    expect(oscillators.length).toBe(2);
    expect(oscillators[0]).not.toBe(oscillators[1]);
    // The bass routes through its own lowpass filter; the kick's oscillator
    // connects straight to its envelope (no filter node) — see triggerKick.
    expect(filters.length).toBe(1);
    expect(filters[0].type).toBe("lowpass");
  });

  it("gives the bass a meaningfully different envelope from the kick: slower attack, longer decay", () => {
    const { context, gains } = createFakeAudioContext();
    const voices = createDrumKitVoices(context);

    const gainsBeforeKick = gains.length;
    voices.trigger("kick", 0, 1);
    const kickEnvelope = gains[gainsBeforeKick];

    const gainsBeforeBass = gains.length;
    voices.trigger("bass", 0, 1);
    const bassEnvelope = gains[gainsBeforeBass];

    const kickAttack = kickEnvelope.gain.linearRampToValueAtTime.mock.calls[0][1];
    const bassAttack = bassEnvelope.gain.linearRampToValueAtTime.mock.calls[0][1];
    expect(bassAttack).toBeGreaterThan(kickAttack);

    const kickDecayEnd = kickEnvelope.gain.exponentialRampToValueAtTime.mock.calls[0][1];
    const bassDecayEnd = bassEnvelope.gain.exponentialRampToValueAtTime.mock.calls[0][1];
    expect(bassDecayEnd - bassAttack).toBeGreaterThan(kickDecayEnd - kickAttack);
  });

  it("still shares the same master bus between kick and bass envelopes", () => {
    const { context, gains } = createFakeAudioContext();
    const voices = createDrumKitVoices(context);
    const masterGain = gains[0]; // createDrumKitVoices creates masterGain first.

    voices.trigger("kick", 0, 1);
    voices.trigger("bass", 0, 1);

    const kickEnvelope = gains[1];
    const bassEnvelope = gains[2];
    expect(kickEnvelope.connect).toHaveBeenCalledWith(masterGain);
    expect(bassEnvelope.connect).toHaveBeenCalledWith(masterGain);
  });
});
