export type Instrument = "practice-pad" | "hihat-closed" | "snare" | "kick" | "bass";

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
  readonly clef: "percussion" | "bass";
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
export const BEAT_TWO_INDEX: EighthIndex = 2;
export const BEAT_THREE_INDEX: EighthIndex = 4;
export const BEAT_FOUR_INDEX: EighthIndex = 6;
// The eighth-note slot immediately after beat 2 — Act III's first kick move
// (EXHIBITION_FLOW.md section 8) pulls the kick from beat 3 onto this slot.
export const OFFBEAT_AFTER_BEAT_TWO_INDEX: EighthIndex = 3;
// Act V's two further offbeat slots (EXHIBITION_FLOW.md section 10): the bass
// answer lands on the first, and the low-voice pickup crossing into the next
// bar lands on the second.
export const OFFBEAT_AFTER_BEAT_THREE_INDEX: EighthIndex = 5;
export const OFFBEAT_AFTER_BEAT_FOUR_INDEX: EighthIndex = 7;

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
        : { ...slot, accent: false, velocity: BASE_VELOCITY },
    ),
  }));

  return { ...pattern, id: `${pattern.id}-accented`, voices };
}

// Act III's three named kick placements (EXHIBITION_FLOW.md section 8): the
// "basic kit" grounds 1 and 3 like a plain backbeat groove; the temporary
// pattern is the mid-lesson state right after the first guided move (kick
// pulled off beat 3 onto the offbeat after 2, beat 1 unchanged); the
// syncopated pattern is the finished "3-3-2" groove (kick on 1, the offbeat
// after 2, and 4) the Laboratory later seeds from.
export const BASIC_KICK_INDICES: readonly EighthIndex[] = [
  BEAT_ONE_INDEX,
  BEAT_THREE_INDEX,
];
export const OFFBEAT_KICK_INDICES: readonly EighthIndex[] = [
  BEAT_ONE_INDEX,
  OFFBEAT_AFTER_BEAT_TWO_INDEX,
];
export const SYNCOPATED_KICK_INDICES: readonly EighthIndex[] = [
  BEAT_ONE_INDEX,
  OFFBEAT_AFTER_BEAT_TWO_INDEX,
  BEAT_FOUR_INDEX,
];

// Act IV's bass voice (EXHIBITION_FLOW.md section 9): the "lock" position
// mirrors the kick's finished 3-3-2 groove exactly (the bass locks in with
// the kick), then the "answer" position shifts every one of those three
// attacks one eighth note later, so bass leans just behind the kick instead
// of landing with it.
export const LOCK_BASS_INDICES: readonly EighthIndex[] = SYNCOPATED_KICK_INDICES;
export const ANSWER_BASS_INDICES: readonly EighthIndex[] = [1, 4, 7];

// Act V's pocket (EXHIBITION_FLOW.md section 10): moving the crowded low pair
// off beat 4 onto the offbeat after it applies to both the kick and the bass
// simultaneously (they stay locked together); the finished groove then adds a
// kick call on beat 3 and a bass answer on the offbeat after it — each move
// re-derives only the one voice it actually changes via withKickIndices/
// withBassIndices, so no new pattern-manipulation function is needed.
export const POCKET_SHIFTED_LOW_INDICES: readonly EighthIndex[] = [
  BEAT_ONE_INDEX,
  OFFBEAT_AFTER_BEAT_TWO_INDEX,
  OFFBEAT_AFTER_BEAT_FOUR_INDEX,
];
export const POCKET_FINAL_KICK_INDICES: readonly EighthIndex[] = [
  BEAT_ONE_INDEX,
  OFFBEAT_AFTER_BEAT_TWO_INDEX,
  BEAT_THREE_INDEX,
  OFFBEAT_AFTER_BEAT_FOUR_INDEX,
];
export const POCKET_FINAL_BASS_INDICES: readonly EighthIndex[] = [
  BEAT_ONE_INDEX,
  OFFBEAT_AFTER_BEAT_TWO_INDEX,
  OFFBEAT_AFTER_BEAT_THREE_INDEX,
  OFFBEAT_AFTER_BEAT_FOUR_INDEX,
];

function drumVoiceSlots(
  instrument: Instrument,
  activeAt: (index: EighthIndex) => boolean,
): NoteEvent[] {
  return Array.from({ length: EIGHTH_COUNT }, (_, i) => {
    const index = i as EighthIndex;
    const active = activeAt(index);
    return {
      active,
      instrument,
      velocity: active ? BASE_VELOCITY : 0,
      accent: false,
      duration: "8",
    };
  });
}

// Act III's real drum kit (EXHIBITION_FLOW.md section 8): a hi-hat voice
// keeping every eighth note, a snare on the backbeat (2 and 4), and a kick
// whose placement is the taught, changing variable — passed in as
// `kickIndices` so the same factory builds the basic groove, the temporary
// post-first-move groove, and the finished 3-3-2 groove.
export function createDrumKitPattern(
  tempoBpm = 96,
  kickIndices: readonly EighthIndex[] = BASIC_KICK_INDICES,
): RhythmPattern {
  const kickSet = new Set<EighthIndex>(kickIndices);
  const snareSet = new Set<EighthIndex>([BEAT_TWO_INDEX, BEAT_FOUR_INDEX]);

  return {
    id: "act-3-drum-kit",
    tempoBpm,
    beatsPerBar: 4,
    beatUnit: 4,
    voices: [
      {
        instrument: "hihat-closed",
        clef: "percussion",
        slots: drumVoiceSlots("hihat-closed", () => true),
      },
      {
        instrument: "snare",
        clef: "percussion",
        slots: drumVoiceSlots("snare", (index) => snareSet.has(index)),
      },
      {
        instrument: "kick",
        clef: "percussion",
        slots: drumVoiceSlots("kick", (index) => kickSet.has(index)),
      },
    ],
  };
}

// Re-derives a drum-kit pattern's kick voice at a new set of indices, leaving
// the hi-hat and snare voices untouched — mirrors withAccentsAt's
// reset-non-target-slots behaviour so repeated calls swap cleanly instead of
// accumulating hits.
export function withKickIndices(
  pattern: RhythmPattern,
  kickIndices: readonly EighthIndex[],
): RhythmPattern {
  const kickSet = new Set<EighthIndex>(kickIndices);
  const voices = pattern.voices.map((voice) =>
    voice.instrument === "kick"
      ? {
          ...voice,
          slots: drumVoiceSlots("kick", (index) => kickSet.has(index)),
        }
      : voice,
  );

  return { ...pattern, id: `${pattern.id}-kick`, voices };
}

// Act IV's "bring in the bass" reveal (EXHIBITION_FLOW.md section 9): adds a
// new bass-clef voice to an existing drum-kit pattern, written at the given
// indices — used exactly once, at the moment the bass first appears, the way
// createDrumKitPattern is used once at Act III's "orchestrate the pulse."
export function addBassVoice(
  pattern: RhythmPattern,
  bassIndices: readonly EighthIndex[],
): RhythmPattern {
  const bassSet = new Set<EighthIndex>(bassIndices);
  const bassVoice: VoicePattern = {
    instrument: "bass",
    clef: "bass",
    slots: drumVoiceSlots("bass", (index) => bassSet.has(index)),
  };

  return { ...pattern, id: `${pattern.id}-bass`, voices: [...pattern.voices, bassVoice] };
}

// Re-derives an existing bass voice at a new set of indices, leaving every
// other voice untouched — mirrors withKickIndices exactly, used for the
// "shift the bass" move and for restoring the locked position afterward.
export function withBassIndices(
  pattern: RhythmPattern,
  bassIndices: readonly EighthIndex[],
): RhythmPattern {
  const bassSet = new Set<EighthIndex>(bassIndices);
  const voices = pattern.voices.map((voice) =>
    voice.instrument === "bass"
      ? {
          ...voice,
          slots: drumVoiceSlots("bass", (index) => bassSet.has(index)),
        }
      : voice,
  );

  return { ...pattern, id: `${pattern.id}-bass`, voices };
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
