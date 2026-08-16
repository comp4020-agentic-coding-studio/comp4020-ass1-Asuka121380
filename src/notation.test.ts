// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  BEAT_ONE_INDEX,
  BEAT_THREE_INDEX,
  createPulsePattern,
  withAccentsAt,
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

  it("destroy() clears the container", () => {
    const container = stageDiv();
    const handles = renderPulseScore(container, createPulsePattern());
    expect(container.querySelector("svg")).not.toBeNull();
    handles.destroy();
    expect(container.querySelector("svg")).toBeNull();
  });
});
