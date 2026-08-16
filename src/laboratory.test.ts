import { describe, expect, it } from "vitest";
import {
  BEAT_FOUR_INDEX,
  BEAT_ONE_INDEX,
  BEAT_THREE_INDEX,
  BEAT_TWO_INDEX,
  OFFBEAT_AFTER_BEAT_TWO_INDEX,
} from "./rhythm-model";
import {
  LAB_INITIAL_TEMPO,
  LAB_PRESETS,
  LAB_RELATIONSHIP_TOOLS,
  LAB_TEMPO_MAX,
  LAB_TEMPO_MIN,
  accentLabSlot,
  applyLabPreset,
  applyLabRelationshipTool,
  clampLabTempo,
  createInitialLabState,
  cycleLabSlot,
  describeLabPattern,
  editLabSlot,
  setLabMasterVolume,
  setLabTempo,
  toggleLabMute,
} from "./laboratory";

function voice(state: ReturnType<typeof createInitialLabState>, instrument: string) {
  return state.pattern.voices.find((v) => v.instrument === instrument)!;
}

describe("laboratory — initial state", () => {
  it("opens on the finished Pocket groove, unedited, unmuted, full volume", () => {
    const state = createInitialLabState();
    expect(state.tempoBpm).toBe(LAB_INITIAL_TEMPO);
    expect(state.hasEdited).toBe(false);
    expect(state.masterVolume).toBe(1);
    expect(state.mutes.size).toBe(0);
    expect(state.pattern.voices).toHaveLength(4);

    const kick = voice(state, "kick");
    expect(kick.slots[BEAT_ONE_INDEX].active).toBe(true);
    expect(kick.slots[OFFBEAT_AFTER_BEAT_TWO_INDEX].active).toBe(true);
  });
});

describe("laboratory — tempo and volume", () => {
  it("clamps tempo to the 70-130 BPM range", () => {
    expect(clampLabTempo(40)).toBe(LAB_TEMPO_MIN);
    expect(clampLabTempo(200)).toBe(LAB_TEMPO_MAX);
    expect(clampLabTempo(110)).toBe(110);
  });

  it("setLabTempo clamps and re-derives the pattern's own tempoBpm", () => {
    const state = setLabTempo(createInitialLabState(), 500);
    expect(state.tempoBpm).toBe(LAB_TEMPO_MAX);
    expect(state.pattern.tempoBpm).toBe(LAB_TEMPO_MAX);
  });

  it("setLabMasterVolume clamps to [0, 1]", () => {
    expect(setLabMasterVolume(createInitialLabState(), -1).masterVolume).toBe(0);
    expect(setLabMasterVolume(createInitialLabState(), 5).masterVolume).toBe(1);
    expect(setLabMasterVolume(createInitialLabState(), 0.3).masterVolume).toBe(0.3);
  });
});

describe("laboratory — mute", () => {
  it("toggles a layer's mute independently of the others", () => {
    let state = createInitialLabState();
    state = toggleLabMute(state, "snare");
    expect(state.mutes.has("snare")).toBe(true);
    expect(state.mutes.has("kick")).toBe(false);

    state = toggleLabMute(state, "snare");
    expect(state.mutes.has("snare")).toBe(false);
  });
});

describe("laboratory — editing", () => {
  it("toggles an active/inactive slot for snare/kick/bass and marks hasEdited", () => {
    let state = createInitialLabState();
    expect(state.hasEdited).toBe(false);

    state = editLabSlot(state, "snare", BEAT_ONE_INDEX);
    expect(state.hasEdited).toBe(true);
    expect(voice(state, "snare").slots[BEAT_ONE_INDEX].active).toBe(true);
  });

  it("never deletes a hi-hat note — editLabSlot is a no-op on that voice", () => {
    const state = createInitialLabState();
    const edited = editLabSlot(state, "hihat-closed", BEAT_ONE_INDEX);
    expect(edited).toBe(state);
    expect(voice(edited, "hihat-closed").slots[BEAT_ONE_INDEX].active).toBe(true);
  });

  it("accentLabSlot accents any voice, including hi-hat, and marks hasEdited", () => {
    let state = createInitialLabState();
    state = accentLabSlot(state, "hihat-closed", BEAT_ONE_INDEX);
    expect(state.hasEdited).toBe(true);
    expect(voice(state, "hihat-closed").slots[BEAT_ONE_INDEX].accent).toBe(true);
  });

  it("cycleLabSlot walks rest -> ordinary -> accented -> rest for an ordinary voice", () => {
    let state = createInitialLabState();
    expect(voice(state, "kick").slots[BEAT_TWO_INDEX].active).toBe(false);

    state = cycleLabSlot(state, "kick", BEAT_TWO_INDEX);
    expect(voice(state, "kick").slots[BEAT_TWO_INDEX]).toMatchObject({ active: true, accent: false });

    state = cycleLabSlot(state, "kick", BEAT_TWO_INDEX);
    expect(voice(state, "kick").slots[BEAT_TWO_INDEX]).toMatchObject({ active: true, accent: true });

    state = cycleLabSlot(state, "kick", BEAT_TWO_INDEX);
    expect(voice(state, "kick").slots[BEAT_TWO_INDEX]).toMatchObject({ active: false, accent: false });
  });

  it("cycleLabSlot only ever toggles hi-hat between ordinary and accented, never deleting it", () => {
    let state = createInitialLabState();
    expect(voice(state, "hihat-closed").slots[BEAT_ONE_INDEX]).toMatchObject({
      active: true,
      accent: false,
    });

    state = cycleLabSlot(state, "hihat-closed", BEAT_ONE_INDEX);
    expect(voice(state, "hihat-closed").slots[BEAT_ONE_INDEX]).toMatchObject({
      active: true,
      accent: true,
    });

    state = cycleLabSlot(state, "hihat-closed", BEAT_ONE_INDEX);
    expect(voice(state, "hihat-closed").slots[BEAT_ONE_INDEX]).toMatchObject({
      active: true,
      accent: false,
    });
  });
});

describe("laboratory — presets", () => {
  it("lists all seven curated presets", () => {
    expect(LAB_PRESETS).toHaveLength(7);
  });

  it("even pulse clears both kick and bass, leaving hi-hat/snare untouched", () => {
    const state = applyLabPreset(createInitialLabState(), "even-pulse");
    expect(voice(state, "kick").slots.every((s) => !s.active)).toBe(true);
    expect(voice(state, "bass").slots.every((s) => !s.active)).toBe(true);
    expect(voice(state, "hihat-closed").slots.every((s) => s.active)).toBe(true);
    expect(voice(state, "snare").slots[BEAT_TWO_INDEX].active).toBe(true);
  });

  it("the pocket restores the finished groove regardless of prior edits", () => {
    let state = applyLabPreset(createInitialLabState(), "even-pulse");
    state = applyLabPreset(state, "the-pocket");
    expect(voice(state, "kick").slots[BEAT_THREE_INDEX].active).toBe(true);
    expect(voice(state, "bass").slots[OFFBEAT_AFTER_BEAT_TWO_INDEX].active).toBe(true);
  });

  it("bass answers offsets the bass from the 3-3-2 kick", () => {
    const state = applyLabPreset(createInitialLabState(), "bass-answers");
    const kick = voice(state, "kick");
    const bass = voice(state, "bass");
    expect(kick.slots[BEAT_ONE_INDEX].active).toBe(true);
    expect(bass.slots[BEAT_ONE_INDEX].active).toBe(false);
    expect(bass.slots[1].active).toBe(true);
  });
});

describe("laboratory — relationship tools", () => {
  it("lists all five relationship tools", () => {
    expect(LAB_RELATIONSHIP_TOOLS).toHaveLength(5);
  });

  it("flips the kick between 1&3 and 2&4 on repeated calls", () => {
    let state = applyLabPreset(createInitialLabState(), "one-three");
    state = applyLabRelationshipTool(state, "flip-one-three-two-four");
    const kick = voice(state, "kick");
    expect(kick.slots[BEAT_TWO_INDEX].active).toBe(true);
    expect(kick.slots[BEAT_FOUR_INDEX].active).toBe(true);
    expect(kick.slots[BEAT_ONE_INDEX].active).toBe(false);

    state = applyLabRelationshipTool(state, "flip-one-three-two-four");
    expect(voice(state, "kick").slots[BEAT_ONE_INDEX].active).toBe(true);
  });

  it("locks the bass onto whatever the kick currently plays", () => {
    let state = applyLabPreset(createInitialLabState(), "three-three-two");
    state = applyLabRelationshipTool(state, "lock-bass-to-kick");
    const kick = voice(state, "kick");
    const bass = voice(state, "bass");
    expect(bass.slots.map((s) => s.active)).toEqual(kick.slots.map((s) => s.active));
  });

  it("shifts every active bass note one eighth-note later", () => {
    let state = applyLabPreset(createInitialLabState(), "bass-locks");
    state = applyLabRelationshipTool(state, "shift-bass-one-step");
    expect(voice(state, "bass").slots[1].active).toBe(true);
    expect(voice(state, "bass").slots[BEAT_ONE_INDEX].active).toBe(false);
  });

  it("clears the bass entirely", () => {
    let state = applyLabPreset(createInitialLabState(), "bass-locks");
    state = applyLabRelationshipTool(state, "clear-bass");
    expect(voice(state, "bass").slots.every((s) => !s.active)).toBe(true);
  });

  it("resets to the finished pocket groove", () => {
    let state = applyLabPreset(createInitialLabState(), "even-pulse");
    state = applyLabRelationshipTool(state, "reset-pocket");
    expect(voice(state, "kick").slots[BEAT_THREE_INDEX].active).toBe(true);
  });
});

describe("laboratory — responsive explanatory notes", () => {
  it("observes the finished groove as back in the pocket", () => {
    expect(describeLabPattern(createInitialLabState().pattern)).toBe("back-in-pocket");
  });

  it("observes a missing backbeat once both snare beats are removed", () => {
    let state = editLabSlot(createInitialLabState(), "snare", BEAT_TWO_INDEX);
    state = editLabSlot(state, "snare", BEAT_FOUR_INDEX);
    expect(describeLabPattern(state.pattern)).toBe("backbeat-gone");
  });

  it("observes crowding when kick, snare, and bass share one attack", () => {
    // Snare already sits on beat 2 by default (POCKET's pattern) — add both
    // the kick and the bass onto that same slot so all three overlap.
    let state = editLabSlot(createInitialLabState(), "kick", BEAT_TWO_INDEX);
    state = editLabSlot(state, "bass", BEAT_TWO_INDEX);
    expect(describeLabPattern(state.pattern)).toBe("lots-of-weight");
  });

  it("observes a locked relationship when kick and bass overlap frequently", () => {
    // "1 & 3" keeps the kick off the default snare backbeat (2 and 4), so
    // locking the bass to it overlaps kick/bass without also tripling up
    // with the snare on the same slot.
    let state = applyLabPreset(createInitialLabState(), "one-three");
    state = applyLabRelationshipTool(state, "lock-bass-to-kick");
    expect(describeLabPattern(state.pattern)).toBe("tightly-locked");
  });

  it("observes an answering relationship when bass regularly follows the kick", () => {
    let state = applyLabPreset(createInitialLabState(), "bass-answers");
    expect(describeLabPattern(state.pattern)).toBe("bass-is-answering");
  });

  it("returns null when no named relationship holds", () => {
    const state = applyLabPreset(createInitialLabState(), "even-pulse");
    expect(describeLabPattern(state.pattern)).toBeNull();
  });
});
