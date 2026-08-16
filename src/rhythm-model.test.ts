import { describe, expect, it } from "vitest";
import {
  BEAT_ONE_INDEX,
  BEAT_THREE_INDEX,
  EIGHTH_LABELS,
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
