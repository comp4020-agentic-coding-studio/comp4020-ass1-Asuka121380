import { describe, expect, it } from "vitest";
import {
  BEAT_ONE_INDEX,
  BEAT_THREE_INDEX,
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
});
