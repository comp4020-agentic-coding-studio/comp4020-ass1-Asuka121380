// The laboratory (EXHIBITION_FLOW.md section 11): the visitor's own editable
// score, opening on the finished Pocket groove. This module holds LabState
// (the editable pattern plus tempo/volume/mute/hasEdited) and every pure
// mutation the laboratory's DOM wiring (main.ts) calls into — no DOM, no
// audio, no timers here, the same separation rhythm-model.ts/exhibition-
// state.ts already keep from main.ts.
import {
  ANSWER_BASS_INDICES,
  BASIC_KICK_INDICES,
  BEAT_FOUR_INDEX,
  BEAT_TWO_INDEX,
  EIGHTH_COUNT,
  LOCK_BASS_INDICES,
  SYNCOPATED_KICK_INDICES,
  createPocketPattern,
  toggleVoiceSlotAccent,
  toggleVoiceSlotActive,
  withBassIndices,
  withKickIndices,
  withTempo,
  type EighthIndex,
  type Instrument,
  type RhythmPattern,
} from "./rhythm-model";

// EXHIBITION_FLOW.md section 11, "Playback controls": tempo range 70-130 BPM.
export const LAB_TEMPO_MIN = 70;
export const LAB_TEMPO_MAX = 130;
export const LAB_INITIAL_TEMPO = 96;

export interface LabState {
  readonly pattern: RhythmPattern;
  readonly tempoBpm: number;
  readonly masterVolume: number;
  readonly mutes: ReadonlySet<Instrument>;
  // Gates the "One last note… ↓" exit reveal — set on the first edit or
  // preset activation, and monotonic (never clears back to false).
  readonly hasEdited: boolean;
}

export function createInitialLabState(tempoBpm = LAB_INITIAL_TEMPO): LabState {
  return {
    pattern: createPocketPattern(tempoBpm),
    tempoBpm,
    masterVolume: 1,
    mutes: new Set(),
    hasEdited: false,
  };
}

export function clampLabTempo(tempoBpm: number): number {
  return Math.min(LAB_TEMPO_MAX, Math.max(LAB_TEMPO_MIN, tempoBpm));
}

export function setLabTempo(state: LabState, tempoBpm: number): LabState {
  const clamped = clampLabTempo(tempoBpm);
  return { ...state, tempoBpm: clamped, pattern: withTempo(state.pattern, clamped) };
}

export function setLabMasterVolume(state: LabState, volume: number): LabState {
  return { ...state, masterVolume: Math.min(1, Math.max(0, volume)) };
}

export function toggleLabMute(state: LabState, instrument: Instrument): LabState {
  const mutes = new Set(state.mutes);
  if (mutes.has(instrument)) mutes.delete(instrument);
  else mutes.add(instrument);
  return { ...state, mutes };
}

// Toggles a slot's active state. Hi-hat notes can only be accented, never
// deleted, in the default laboratory (EXHIBITION_FLOW.md section 11) — this
// is a no-op for that voice rather than relying solely on main.ts to never
// wire the delete interaction to it.
export function editLabSlot(
  state: LabState,
  instrument: Instrument,
  index: EighthIndex,
): LabState {
  if (instrument === "hihat-closed") return state;
  return { ...state, pattern: toggleVoiceSlotActive(state.pattern, instrument, index), hasEdited: true };
}

export function accentLabSlot(
  state: LabState,
  instrument: Instrument,
  index: EighthIndex,
): LabState {
  return { ...state, pattern: toggleVoiceSlotAccent(state.pattern, instrument, index), hasEdited: true };
}

// The single interaction a laboratory note target performs on click/tap or
// Enter/Space (EXHIBITION_FLOW.md section 11: "Enter or Space while a note
// position is focused: add/remove or accent the note") — a three-state cycle
// (rest -> ordinary -> accented -> rest) so one action serves both jobs
// without a separate modifier key. Hi-hat can never rest (editLabSlot is a
// no-op on it), so its cycle collapses to the two states it actually has
// (ordinary <-> accented).
export function cycleLabSlot(
  state: LabState,
  instrument: Instrument,
  index: EighthIndex,
): LabState {
  const voice = state.pattern.voices.find((v) => v.instrument === instrument);
  const slot = voice?.slots[index];
  if (!slot) return state;

  if (!slot.active) return editLabSlot(state, instrument, index);
  if (!slot.accent) return accentLabSlot(state, instrument, index);

  // active + accented -> rest: clear the accent, then (for every voice but
  // hi-hat) clear the note itself.
  const unaccented = accentLabSlot(state, instrument, index);
  return instrument === "hihat-closed" ? unaccented : editLabSlot(unaccented, instrument, index);
}

function activeIndices(pattern: RhythmPattern, instrument: Instrument): EighthIndex[] {
  const voice = pattern.voices.find((v) => v.instrument === instrument);
  if (!voice) return [];
  return voice.slots
    .map((slot, i) => (slot.active ? (i as EighthIndex) : null))
    .filter((i): i is EighthIndex => i !== null);
}

// EXHIBITION_FLOW.md section 11's seven curated presets. Hi-hat and snare
// always stay present (the laboratory keeps the always-on drum-kit + bass
// model rather than removing voices); each preset only re-derives the kick
// ("bass drum" in the flow doc) and, where named, the bass — reusing the same
// index constants Acts III-V already teach with, rather than inventing new
// per-preset values the flow doc doesn't specify.
export type LabPreset =
  | "even-pulse"
  | "one-three"
  | "two-four"
  | "three-three-two"
  | "bass-locks"
  | "bass-answers"
  | "the-pocket";

export const LAB_PRESETS: readonly { readonly id: LabPreset; readonly label: string }[] = [
  { id: "even-pulse", label: "even pulse" },
  { id: "one-three", label: "1 & 3" },
  { id: "two-four", label: "2 & 4" },
  { id: "three-three-two", label: "3–3–2" },
  { id: "bass-locks", label: "bass locks" },
  { id: "bass-answers", label: "bass answers" },
  { id: "the-pocket", label: "the pocket" },
];

const TWO_FOUR_KICK_INDICES: readonly EighthIndex[] = [BEAT_TWO_INDEX, BEAT_FOUR_INDEX];

function applyPreset(pattern: RhythmPattern, preset: LabPreset): RhythmPattern {
  switch (preset) {
    case "even-pulse":
      return withBassIndices(withKickIndices(pattern, []), []);
    case "one-three":
      return withBassIndices(withKickIndices(pattern, BASIC_KICK_INDICES), []);
    case "two-four":
      return withBassIndices(withKickIndices(pattern, TWO_FOUR_KICK_INDICES), []);
    case "three-three-two":
      return withBassIndices(withKickIndices(pattern, SYNCOPATED_KICK_INDICES), []);
    case "bass-locks":
      return withBassIndices(withKickIndices(pattern, SYNCOPATED_KICK_INDICES), LOCK_BASS_INDICES);
    case "bass-answers":
      return withBassIndices(withKickIndices(pattern, SYNCOPATED_KICK_INDICES), ANSWER_BASS_INDICES);
    case "the-pocket":
      return createPocketPattern(pattern.tempoBpm);
  }
}

export function applyLabPreset(state: LabState, preset: LabPreset): LabState {
  return { ...state, pattern: applyPreset(state.pattern, preset), hasEdited: true };
}

// EXHIBITION_FLOW.md section 11's five permanently-unlocked relationship
// tools. Each re-derives only the voice(s) it names, mirroring the
// withKickIndices/withBassIndices convention Acts III-V already established.
export type LabRelationshipTool =
  | "flip-one-three-two-four"
  | "lock-bass-to-kick"
  | "shift-bass-one-step"
  | "clear-bass"
  | "reset-pocket";

export const LAB_RELATIONSHIP_TOOLS: readonly { readonly id: LabRelationshipTool; readonly label: string }[] = [
  { id: "flip-one-three-two-four", label: "flip 1·3 ↔ 2·4" },
  { id: "lock-bass-to-kick", label: "lock bass to kick" },
  { id: "shift-bass-one-step", label: "shift bass one step →" },
  { id: "clear-bass", label: "clear bass" },
  { id: "reset-pocket", label: "reset the pocket" },
];

function flipKickOneThreeTwoFour(pattern: RhythmPattern): RhythmPattern {
  const current = activeIndices(pattern, "kick");
  const isOnTwoFour =
    current.length === TWO_FOUR_KICK_INDICES.length &&
    TWO_FOUR_KICK_INDICES.every((i) => current.includes(i));
  return withKickIndices(pattern, isOnTwoFour ? BASIC_KICK_INDICES : TWO_FOUR_KICK_INDICES);
}

function lockBassToKick(pattern: RhythmPattern): RhythmPattern {
  return withBassIndices(pattern, activeIndices(pattern, "kick"));
}

function shiftBassOneStep(pattern: RhythmPattern): RhythmPattern {
  const shifted = activeIndices(pattern, "bass").map((i) => ((i + 1) % EIGHTH_COUNT) as EighthIndex);
  return withBassIndices(pattern, shifted);
}

function applyRelationshipTool(pattern: RhythmPattern, tool: LabRelationshipTool): RhythmPattern {
  switch (tool) {
    case "flip-one-three-two-four":
      return flipKickOneThreeTwoFour(pattern);
    case "lock-bass-to-kick":
      return lockBassToKick(pattern);
    case "shift-bass-one-step":
      return shiftBassOneStep(pattern);
    case "clear-bass":
      return withBassIndices(pattern, []);
    case "reset-pocket":
      return createPocketPattern(pattern.tempoBpm);
  }
}

export function applyLabRelationshipTool(state: LabState, tool: LabRelationshipTool): LabState {
  return { ...state, pattern: applyRelationshipTool(state.pattern, tool), hasEdited: true };
}

// EXHIBITION_FLOW.md section 11's five responsive explanatory notes — plain
// structural observations, never a correctness judgement. Only one shows at
// a time (the same one-annotation-visible convention every act already
// uses), so this returns at most a single id in a fixed precedence: the
// finished-groove match is checked first since it's the most specific, "lots
// of weight" (three voices sharing an attack) before the pairwise kick/bass
// relationships since three-way crowding is the more urgent observation.
export type LabObservation =
  | "back-in-pocket"
  | "backbeat-gone"
  | "lots-of-weight"
  | "tightly-locked"
  | "bass-is-answering";

export const LAB_OBSERVATION_TEXT: Record<LabObservation, string> = {
  "back-in-pocket": "back in the pocket",
  "backbeat-gone": "where did the backbeat go?",
  "lots-of-weight": "lots of weight—very little space",
  "tightly-locked": "tightly locked",
  "bass-is-answering": "the bass is answering",
};

function patternFingerprint(pattern: RhythmPattern): string {
  return pattern.voices
    .map(
      (voice) =>
        `${voice.instrument}:${voice.slots.map((slot) => (slot.active ? (slot.accent ? "A" : "x") : "-")).join("")}`,
    )
    .sort()
    .join("|");
}

export function describeLabPattern(pattern: RhythmPattern): LabObservation | null {
  if (patternFingerprint(pattern) === patternFingerprint(createPocketPattern(pattern.tempoBpm))) {
    return "back-in-pocket";
  }

  const snare = new Set(activeIndices(pattern, "snare"));
  if (!snare.has(BEAT_TWO_INDEX) && !snare.has(BEAT_FOUR_INDEX)) {
    return "backbeat-gone";
  }

  const kick = new Set(activeIndices(pattern, "kick"));
  const bass = new Set(activeIndices(pattern, "bass"));

  for (let i = 0; i < EIGHTH_COUNT; i++) {
    const index = i as EighthIndex;
    const sharedCount = [kick.has(index), snare.has(index), bass.has(index)].filter(Boolean).length;
    if (sharedCount >= 3) return "lots-of-weight";
  }

  if (kick.size > 0 && bass.size > 0) {
    const overlap = [...kick].filter((i) => bass.has(i)).length;
    if (overlap >= 2) return "tightly-locked";

    const answering = [...kick].filter((i) => bass.has(((i + 1) % EIGHTH_COUNT) as EighthIndex)).length;
    if (answering >= 2) return "bass-is-answering";
  }

  return null;
}
