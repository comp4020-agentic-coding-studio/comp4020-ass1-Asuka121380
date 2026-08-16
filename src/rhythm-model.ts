export type Instrument = "practice-pad";
// Extension seam for Act III onward: | "hihat-closed" | "snare" | "kick" | "bass"

export type EighthIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface NoteEvent {
  readonly active: boolean;
  readonly instrument: Instrument;
  readonly velocity: number;
  readonly accent: boolean;
  readonly duration: "8";
}

export interface VoicePattern {
  readonly instrument: Instrument;
  readonly clef: "percussion";
  readonly slots: readonly NoteEvent[];
}

export interface RhythmPattern {
  readonly id: string;
  readonly tempoBpm: number;
  readonly beatsPerBar: 4;
  readonly beatUnit: 4;
  readonly voices: readonly VoicePattern[];
}

export interface RhythmState {
  readonly currentPattern: RhythmPattern;
  readonly pendingPattern: RhythmPattern | null;
}

export const EIGHTH_COUNT = 8;
export const BEAT_ONE_INDEX: EighthIndex = 0;
export const BEAT_THREE_INDEX: EighthIndex = 4;

// Printed count row under the staff (EXHIBITION_FLOW.md section 6) — one
// label per eighth-note slot, positioned against that slot's NoteBox in
// main.ts rather than laid out as prose.
export const EIGHTH_LABELS: readonly string[] = [
  "1",
  "&",
  "2",
  "&",
  "3",
  "&",
  "4",
  "&",
];

// A real-browser listening pass found the prior 0.6/0.95 pairing (~1.6x, a
// ~4dB gain difference) too subtle to read as "accented" by ear — widened to
// a >2.5x ratio (>=8dB) so ordinary beats sit back and the accented beats are
// unmistakably heavier, not just marginally louder.
const BASE_VELOCITY = 0.4;
const ACCENT_VELOCITY = 1.0;

export function createPulsePattern(tempoBpm = 96): RhythmPattern {
  const slots: NoteEvent[] = Array.from({ length: EIGHTH_COUNT }, () => ({
    active: true,
    instrument: "practice-pad",
    velocity: BASE_VELOCITY,
    accent: false,
    duration: "8",
  }));

  return {
    id: "act-1-pulse",
    tempoBpm,
    beatsPerBar: 4,
    beatUnit: 4,
    voices: [{ instrument: "practice-pad", clef: "percussion", slots }],
  };
}

// The title screen's "faint empty staff" (EXHIBITION_FLOW.md section 5) is
// just a stave/clef/time-signature with no notes — renderPulseScore already
// draws that correctly when a voice has zero slots.
export function createEmptyStavePattern(tempoBpm = 96): RhythmPattern {
  return {
    id: "title-empty-staff",
    tempoBpm,
    beatsPerBar: 4,
    beatUnit: 4,
    voices: [{ instrument: "practice-pad", clef: "percussion", slots: [] }],
  };
}

export function withAccentsAt(
  pattern: RhythmPattern,
  indices: readonly EighthIndex[],
): RhythmPattern {
  const accentSet = new Set<EighthIndex>(indices);
  const voices = pattern.voices.map((voice) => ({
    ...voice,
    slots: voice.slots.map((slot, index) =>
      accentSet.has(index as EighthIndex)
        ? { ...slot, accent: true, velocity: ACCENT_VELOCITY }
        : slot,
    ),
  }));

  return { ...pattern, id: `${pattern.id}-accented`, voices };
}

export function activeInstruments(pattern: RhythmPattern): Instrument[] {
  const instruments = new Set<Instrument>();
  for (const voice of pattern.voices) {
    if (voice.slots.some((slot) => slot.active)) instruments.add(voice.instrument);
  }
  return [...instruments];
}

export function allVelocitiesEqual(pattern: RhythmPattern): boolean {
  const velocities = pattern.voices.flatMap((voice) =>
    voice.slots.map((slot) => slot.velocity),
  );
  return velocities.every((v) => v === velocities[0]);
}

export function createInitialRhythmState(tempoBpm = 96): RhythmState {
  return { currentPattern: createPulsePattern(tempoBpm), pendingPattern: null };
}

export function queuePendingPattern(
  state: RhythmState,
  next: RhythmPattern,
): RhythmState {
  return { ...state, pendingPattern: next };
}

export function applyPendingPattern(state: RhythmState): RhythmState {
  if (!state.pendingPattern) return state;
  return { currentPattern: state.pendingPattern, pendingPattern: null };
}
