// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  BASIC_KICK_INDICES,
  BEAT_FOUR_INDEX,
  BEAT_ONE_INDEX,
  BEAT_THREE_INDEX,
  BEAT_TWO_INDEX,
  OFFBEAT_AFTER_BEAT_TWO_INDEX,
  SYNCOPATED_KICK_INDICES,
  createDrumKitPattern,
  createEmptyStavePattern,
  createPulsePattern,
  withAccentsAt,
  withKickIndices,
} from "./rhythm-model";
import { renderPulseScore } from "./notation";

function stageDiv(): HTMLDivElement {
  const div = document.createElement("div");
  div.style.width = "800px";
  div.style.height = "300px";
  document.body.append(div);
  return div;
}

// VexFlow draws the accent (SMuFL articAccentAbove, U+E4A0) as a bare
// <text> glyph with no dedicated class, so the only mechanical way to
// count it is by codepoint. Escaped, not embedded raw, since it's a PUA char.
const ACCENT_GLYPH = "\uE4A0";

function countAccentGlyphs(svg: SVGSVGElement): number {
  return (svg.textContent ?? "").split(ACCENT_GLYPH).length - 1;
}

describe("notation — Act I score", () => {
  it("renders a single 5-line stave with a percussion clef and time signature", () => {
    const { svg } = renderPulseScore(stageDiv(), createPulsePattern());
    expect(svg.querySelectorAll(".vf-stave").length).toBe(1);
    expect(svg.querySelectorAll(".vf-clef").length).toBe(1);
    expect(svg.querySelectorAll(".vf-timesignature").length).toBe(1);
  });

  it("renders exactly eight noteheads, eight stems, no flags, and one continuous beam", () => {
    const { svg } = renderPulseScore(stageDiv(), createPulsePattern());
    expect(svg.querySelectorAll(".vf-stavenote").length).toBe(8);
    expect(svg.querySelectorAll(".vf-stem").length).toBe(8);
    expect(svg.querySelectorAll(".vf-flag").length).toBe(0);
    expect(svg.querySelectorAll(".vf-beam").length).toBe(1);
  });

  it("renders an accent glyph once per accented slot, and none when unaccented", () => {
    const plain = renderPulseScore(stageDiv(), createPulsePattern()).svg;
    expect(countAccentGlyphs(plain)).toBe(0);

    const accented = renderPulseScore(
      stageDiv(),
      withAccentsAt(createPulsePattern(), [BEAT_ONE_INDEX, BEAT_THREE_INDEX]),
    ).svg;
    expect(countAccentGlyphs(accented)).toBe(2);
  });

  it("exposes one note bounding box per slot, in draw order", () => {
    const { noteBoxes } = renderPulseScore(stageDiv(), createPulsePattern());
    expect(noteBoxes.length).toBe(8);
    for (const box of noteBoxes) {
      expect(box.w).toBeGreaterThan(0);
      expect(box.h).toBeGreaterThan(0);
    }
    // Beat 3 sits to the right of beat 1 on the stave.
    expect(noteBoxes[BEAT_THREE_INDEX].x).toBeGreaterThan(
      noteBoxes[BEAT_ONE_INDEX].x,
    );
  });

  it("exposes no note boxes for the empty title-screen stave", () => {
    const { noteBoxes } = renderPulseScore(stageDiv(), createEmptyStavePattern());
    expect(noteBoxes.length).toBe(0);
  });

  it("destroy() clears the container", () => {
    const container = stageDiv();
    const handles = renderPulseScore(container, createPulsePattern());
    expect(container.querySelector("svg")).not.toBeNull();
    handles.destroy();
    expect(container.querySelector("svg")).toBeNull();
  });
});

describe("notation — Act III drum kit", () => {
  it("renders one shared stave/clef/time-signature for the two-voice drum-kit stage", () => {
    const { svg } = renderPulseScore(
      stageDiv(),
      createDrumKitPattern(96, BASIC_KICK_INDICES),
    );
    expect(svg.querySelectorAll(".vf-stave").length).toBe(1);
    expect(svg.querySelectorAll(".vf-clef").length).toBe(1);
    expect(svg.querySelectorAll(".vf-timesignature").length).toBe(1);
  });

  it("renders a hi-hat/snare chord on every eighth plus a kick note-or-rest, stemming and flagging only the two isolated kick hits", () => {
    const { svg } = renderPulseScore(
      stageDiv(),
      createDrumKitPattern(96, BASIC_KICK_INDICES),
    );
    // 8 upper-voice chords + 8 lower-voice notes-or-rests.
    expect(svg.querySelectorAll(".vf-stavenote").length).toBe(16);
    // 8 up-stems (hi-hat/snare, every slot) + 2 down-stems (the two kick
    // hits on beat 1 and beat 3); the 6 kick rests draw no stem.
    expect(svg.querySelectorAll(".vf-stem").length).toBe(10);
    // Beat 1 and beat 3 are not adjacent, so each isolated kick hit gets
    // its own flag rather than joining a beam.
    expect(svg.querySelectorAll(".vf-flag").length).toBe(2);
    // One continuous beam across the hi-hat/snare voice; no kick beam since
    // neither hit has a contiguous neighbour.
    expect(svg.querySelectorAll(".vf-beam").length).toBe(1);
  });

  it("beams a contiguous run of two-or-more kick hits together instead of flagging them individually", () => {
    const contiguous = withKickIndices(createDrumKitPattern(), [1, 2]);
    const { svg } = renderPulseScore(stageDiv(), contiguous);
    // hi-hat/snare beam + one kick beam covering the adjacent pair.
    expect(svg.querySelectorAll(".vf-beam").length).toBe(2);
    expect(svg.querySelectorAll(".vf-flag").length).toBe(0);
  });

  it("re-derives only the kick row when the taught kick placement changes", () => {
    const before = renderPulseScore(
      stageDiv(),
      createDrumKitPattern(96, BASIC_KICK_INDICES),
    ).svg;
    const after = renderPulseScore(
      stageDiv(),
      withKickIndices(createDrumKitPattern(96, BASIC_KICK_INDICES), SYNCOPATED_KICK_INDICES),
    ).svg;
    // Basic groove: 2 isolated kick hits (beat 1, beat 3) -> 2 flags.
    expect(countFlags(before)).toBe(2);
    // 3-3-2 groove: kick on beat 1, the offbeat after 2, and beat 4 -- still
    // three mutually non-adjacent hits -> 3 flags, not a beam.
    expect(countFlags(after)).toBe(3);
  });

  it("exposes one note bounding box per slot, sized for the taller two-voice stave", () => {
    const { noteBoxes } = renderPulseScore(
      stageDiv(),
      createDrumKitPattern(96, SYNCOPATED_KICK_INDICES),
    );
    expect(noteBoxes.length).toBe(8);
    for (const box of noteBoxes) {
      expect(box.w).toBeGreaterThan(0);
      expect(box.h).toBeGreaterThan(0);
    }
    expect(noteBoxes[BEAT_THREE_INDEX].x).toBeGreaterThan(noteBoxes[BEAT_ONE_INDEX].x);
    expect(noteBoxes[BEAT_TWO_INDEX].x).toBeGreaterThan(noteBoxes[BEAT_ONE_INDEX].x);
    expect(noteBoxes[OFFBEAT_AFTER_BEAT_TWO_INDEX].x).toBeGreaterThan(
      noteBoxes[BEAT_TWO_INDEX].x,
    );
    expect(noteBoxes[BEAT_FOUR_INDEX].x).toBeGreaterThan(
      noteBoxes[OFFBEAT_AFTER_BEAT_TWO_INDEX].x,
    );
  });
});

function countFlags(svg: SVGSVGElement): number {
  return svg.querySelectorAll(".vf-flag").length;
}
