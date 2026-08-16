import { describe, expect, it } from "vitest";
import {
  BASIC_KICK_INDICES,
  BEAT_FOUR_INDEX,
  BEAT_ONE_INDEX,
  BEAT_THREE_INDEX,
  BEAT_TWO_INDEX,
  EIGHTH_LABELS,
  OFFBEAT_AFTER_BEAT_TWO_INDEX,
  OFFBEAT_KICK_INDICES,
  SYNCOPATED_KICK_INDICES,
  createDrumKitPattern,
  createPulsePattern,
  withAccentsAt,
  withKickIndices,
} from "./rhythm-model";

describe("rhythm model — eighth-note labels", () => {
  it("has exactly one label per eighth-note slot", () => {
    expect(EIGHTH_LABELS.length).toBe(8);
  });

  it("labels beat 1 and beat 3 with their beat numbers", () => {
    expect(EIGHTH_LABELS[BEAT_ONE_INDEX]).toBe("1");
    expect(EIGHTH_LABELS[BEAT_THREE_INDEX]).toBe("3");
  });

  it("labels every off-beat with '&'", () => {
    expect(EIGHTH_LABELS[1]).toBe("&");
    expect(EIGHTH_LABELS[3]).toBe("&");
    expect(EIGHTH_LABELS[5]).toBe("&");
    expect(EIGHTH_LABELS[7]).toBe("&");
  });
});

describe("rhythm model — accent contrast", () => {
  it("accents a beat with a meaningfully larger, still-valid velocity", () => {
    const base = createPulsePattern();
    const accented = withAccentsAt(base, [BEAT_ONE_INDEX, BEAT_THREE_INDEX]);
    const baseVelocity = base.voices[0].slots[1].velocity;
    const accentVelocity = accented.voices[0].slots[BEAT_ONE_INDEX].velocity;

    // A real-browser listening pass found ~1.6x too subtle to read as
    // "accented" by ear — this pins the fix to a genuinely large ratio.
    expect(accentVelocity / baseVelocity).toBeGreaterThanOrEqual(2.5);
    expect(baseVelocity).toBeGreaterThan(0);
    expect(accentVelocity).toBeLessThanOrEqual(1);
  });

  it("cleanly swaps the accent set on repeated calls instead of accumulating it", () => {
    // Act II's flip (EXHIBITION_FLOW.md section 7) repeatedly re-derives the
    // accent pattern from the same base pattern — 1/3 must fully revert to
    // base once 2/4 is applied, not stay accented alongside it.
    const base = createPulsePattern();
    const onOneAndThree = withAccentsAt(base, [BEAT_ONE_INDEX, BEAT_THREE_INDEX]);
    const onTwoAndFour = withAccentsAt(onOneAndThree, [BEAT_TWO_INDEX, BEAT_FOUR_INDEX]);

    const slots = onTwoAndFour.voices[0].slots;
    expect(slots[BEAT_TWO_INDEX].accent).toBe(true);
    expect(slots[BEAT_FOUR_INDEX].accent).toBe(true);
    expect(slots[BEAT_ONE_INDEX].accent).toBe(false);
    expect(slots[BEAT_THREE_INDEX].accent).toBe(false);
    expect(slots[BEAT_ONE_INDEX].velocity).toBe(slots[1].velocity);
    expect(slots[BEAT_THREE_INDEX].velocity).toBe(slots[1].velocity);
  });
});

describe("rhythm model — Act III drum kit", () => {
  it("builds three simultaneous voices: hi-hat on every eighth, snare on 2 and 4, kick at the given indices", () => {
    const pattern = createDrumKitPattern(96, BASIC_KICK_INDICES);
    expect(pattern.voices).toHaveLength(3);

    const hihat = pattern.voices.find((v) => v.instrument === "hihat-closed");
    const snare = pattern.voices.find((v) => v.instrument === "snare");
    const kick = pattern.voices.find((v) => v.instrument === "kick");
    expect(hihat && snare && kick).toBeTruthy();

    expect(hihat!.slots.every((slot) => slot.active)).toBe(true);

    expect(snare!.slots[BEAT_TWO_INDEX].active).toBe(true);
    expect(snare!.slots[BEAT_FOUR_INDEX].active).toBe(true);
    expect(snare!.slots[BEAT_ONE_INDEX].active).toBe(false);
    expect(snare!.slots[BEAT_THREE_INDEX].active).toBe(false);

    expect(kick!.slots[BEAT_ONE_INDEX].active).toBe(true);
    expect(kick!.slots[BEAT_THREE_INDEX].active).toBe(true);
    expect(kick!.slots[BEAT_TWO_INDEX].active).toBe(false);
  });

  it("re-derives only the kick voice's slots, leaving hi-hat and snare untouched", () => {
    const basic = createDrumKitPattern(96, BASIC_KICK_INDICES);
    const offbeat = withKickIndices(basic, OFFBEAT_KICK_INDICES);

    const kick = offbeat.voices.find((v) => v.instrument === "kick")!;
    expect(kick.slots[BEAT_ONE_INDEX].active).toBe(true);
    expect(kick.slots[OFFBEAT_AFTER_BEAT_TWO_INDEX].active).toBe(true);
    expect(kick.slots[BEAT_THREE_INDEX].active).toBe(false);

    const hihat = offbeat.voices.find((v) => v.instrument === "hihat-closed")!;
    const snare = offbeat.voices.find((v) => v.instrument === "snare")!;
    expect(hihat.slots.every((slot) => slot.active)).toBe(true);
    expect(snare.slots[BEAT_TWO_INDEX].active).toBe(true);
    expect(snare.slots[BEAT_FOUR_INDEX].active).toBe(true);

    const syncopated = withKickIndices(offbeat, SYNCOPATED_KICK_INDICES);
    const syncopatedKick = syncopated.voices.find((v) => v.instrument === "kick")!;
    expect(syncopatedKick.slots[BEAT_ONE_INDEX].active).toBe(true);
    expect(syncopatedKick.slots[OFFBEAT_AFTER_BEAT_TWO_INDEX].active).toBe(true);
    expect(syncopatedKick.slots[BEAT_FOUR_INDEX].active).toBe(true);
    expect(syncopatedKick.slots[BEAT_THREE_INDEX].active).toBe(false);
  });
});
