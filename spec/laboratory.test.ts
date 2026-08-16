// The laboratory + acknowledgement page's own *pattern-editing* logic is
// already fully covered by src/laboratory.test.ts (20 unit tests), and the
// exhibition-to-laboratory hand-off is covered by spec/act-5.test.ts's final
// test. What isn't covered anywhere yet is the static markup this milestone
// added to index.html — the contract main.ts's DOM wiring depends on. This
// file follows spec/act-1.test.ts's "built page" convention (JSDOM against
// the built dist/, no script execution) rather than simulating main.ts's
// runtime event handlers, per CLAUDE.md's "static tests cannot validate
// runtime interaction" note — the actual button/keyboard/touch behaviour is
// verified live in a real browser instead.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import {
  LAB_INITIAL_TEMPO,
  LAB_TEMPO_MAX,
  LAB_TEMPO_MIN,
} from "../src/laboratory";

describe("built page — laboratory and acknowledgement contract", () => {
  const distPath = resolve("dist/index.html");
  const NEXT_STEP =
    "Build the laboratory + acknowledgement markup — see EXHIBITION_FLOW.md sections 11-12.";

  it("built the site", () => {
    expect(existsSync(distPath), `${distPath} not found. ${NEXT_STEP}`).toBe(
      true,
    );
  });

  const doc = existsSync(distPath)
    ? new JSDOM(readFileSync(distPath, "utf8")).window.document
    : undefined;

  it("the laboratory-flow scroll container and its two sections exist", () => {
    expect(doc, NEXT_STEP).toBeTruthy();
    expect(doc!.querySelector('[data-testid="laboratory-flow"]')).toBeTruthy();
    expect(doc!.querySelector('[data-testid="laboratory"]')).toBeTruthy();
    expect(doc!.querySelector('[data-testid="acknowledgement"]')).toBeTruthy();
  });

  it("the lab staff frame and hit-targets container are present for the renderer to fill", () => {
    expect(doc, NEXT_STEP).toBeTruthy();
    expect(doc!.querySelector('[data-testid="lab-staff"]')).toBeTruthy();
    expect(doc!.querySelector('[data-testid="lab-hit-targets"]')).toBeTruthy();
  });

  it("the lab observation line is a live region so new observations are announced", () => {
    expect(doc, NEXT_STEP).toBeTruthy();
    const observation = doc!.querySelector('[data-testid="lab-observation"]');
    expect(observation).toBeTruthy();
    expect(observation!.getAttribute("aria-live")).toBe("polite");
  });

  it("all four mute buttons exist, are real buttons with accessible names, and start un-pressed", () => {
    expect(doc, NEXT_STEP).toBeTruthy();
    for (const instrument of ["hihat-closed", "snare", "kick", "bass"]) {
      const mute = doc!.querySelector<HTMLButtonElement>(
        `[data-testid="lab-mute-${instrument}"]`,
      );
      expect(mute, `missing mute button for ${instrument}`).toBeTruthy();
      expect(mute!.tagName).toBe("BUTTON");
      expect(mute!.textContent?.trim()).toBeTruthy();
      expect(mute!.getAttribute("aria-pressed")).toBe("false");
    }
  });

  it("the lab play/pause and restart controls are real buttons with accessible names", () => {
    expect(doc, NEXT_STEP).toBeTruthy();
    const playPause = doc!.querySelector<HTMLButtonElement>(
      '[data-testid="lab-play-pause"]',
    );
    expect(playPause).toBeTruthy();
    expect(playPause!.tagName).toBe("BUTTON");
    expect(playPause!.hasAttribute("aria-pressed")).toBe(true);
    expect(playPause!.textContent?.trim()).toBeTruthy();

    const restart = doc!.querySelector<HTMLButtonElement>(
      '[data-testid="lab-restart"]',
    );
    expect(restart).toBeTruthy();
    expect(restart!.tagName).toBe("BUTTON");
    expect(restart!.textContent?.trim()).toBeTruthy();
  });

  it("the tempo slider's bounds and starting value match the laboratory module's own clamp range", () => {
    expect(doc, NEXT_STEP).toBeTruthy();
    const tempo = doc!.querySelector<HTMLInputElement>('[data-testid="lab-tempo"]');
    expect(tempo).toBeTruthy();
    expect(tempo!.type).toBe("range");
    expect(Number(tempo!.min)).toBe(LAB_TEMPO_MIN);
    expect(Number(tempo!.max)).toBe(LAB_TEMPO_MAX);
    expect(Number(tempo!.value)).toBe(LAB_INITIAL_TEMPO);
    // A slider needs a text label a screen reader can associate with it —
    // via <label for>, not merely adjacent text.
    expect(doc!.querySelector(`label[for="${tempo!.id}"]`)).toBeTruthy();
  });

  it("the volume slider spans the full [0, 1] gain range and starts at full volume", () => {
    expect(doc, NEXT_STEP).toBeTruthy();
    const volume = doc!.querySelector<HTMLInputElement>('[data-testid="lab-volume"]');
    expect(volume).toBeTruthy();
    expect(volume!.type).toBe("range");
    expect(Number(volume!.min)).toBe(0);
    expect(Number(volume!.max)).toBe(1);
    expect(Number(volume!.value)).toBe(1);
    expect(doc!.querySelector(`label[for="${volume!.id}"]`)).toBeTruthy();
  });

  it("the preset and relationship-tool containers exist, ready to be filled at runtime", () => {
    expect(doc, NEXT_STEP).toBeTruthy();
    expect(doc!.querySelector('[data-testid="lab-presets"]')).toBeTruthy();
    expect(doc!.querySelector('[data-testid="lab-tools"]')).toBeTruthy();
  });

  it("the exit prompt starts hidden and carries real text for when it's revealed", () => {
    expect(doc, NEXT_STEP).toBeTruthy();
    const prompt = doc!.querySelector('[data-testid="lab-exit-prompt"]');
    expect(prompt).toBeTruthy();
    expect(prompt!.hasAttribute("hidden")).toBe(true);
    expect(prompt!.textContent?.trim()).toBeTruthy();
  });

  it("the acknowledgement page's staff placeholder is hidden from assistive tech", () => {
    expect(doc, NEXT_STEP).toBeTruthy();
    const ackStaff = doc!.querySelector('[data-testid="ack-staff"]');
    expect(ackStaff).toBeTruthy();
    expect(ackStaff!.getAttribute("aria-hidden")).toBe("true");
  });

  it("the acknowledgement page's replay and return controls are real buttons with accessible names", () => {
    expect(doc, NEXT_STEP).toBeTruthy();
    const replay = doc!.querySelector<HTMLButtonElement>('[data-testid="ack-replay"]');
    expect(replay).toBeTruthy();
    expect(replay!.tagName).toBe("BUTTON");
    expect(replay!.textContent?.trim()).toBeTruthy();

    const back = doc!.querySelector<HTMLButtonElement>('[data-testid="ack-return"]');
    expect(back).toBeTruthy();
    expect(back!.tagName).toBe("BUTTON");
    expect(back!.textContent?.trim()).toBeTruthy();
  });

  it("retains the invariant single h1, nav landmark, lang, and viewport meta", () => {
    expect(doc, NEXT_STEP).toBeTruthy();
    expect(doc!.documentElement.getAttribute("lang")).toBeTruthy();
    expect(doc!.querySelector('meta[name="viewport"]')).toBeTruthy();
    expect(doc!.querySelector("nav")).toBeTruthy();
    expect(doc!.querySelectorAll("h1").length).toBe(1);
  });
});
