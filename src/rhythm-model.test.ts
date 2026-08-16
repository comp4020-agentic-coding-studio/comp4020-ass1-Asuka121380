import { describe, expect, it } from "vitest";
import {
  BEAT_FOUR_INDEX,
  BEAT_ONE_INDEX,
  BEAT_THREE_INDEX,
  BEAT_TWO_INDEX,
  EIGHTH_LABELS,
  createPulsePattern,
  withAccentsAt,
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
