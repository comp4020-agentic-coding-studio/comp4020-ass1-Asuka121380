// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { initTitleScreen, type TitleScreenElements } from "./title-screen";

// jsdom has no real Web Audio implementation, so tests inject this fake
// rather than constructing a real AudioContext.
function fakeAudioContext(): AudioContext {
  return { resume: vi.fn().mockResolvedValue(undefined) } as unknown as AudioContext;
}

function stageElements(): TitleScreenElements {
  const root = document.createElement("section");
  const startButton = document.createElement("button");
  const stage = document.createElement("section");
  document.body.append(root, stage);
  root.append(startButton);
  return { root, startButton, stage };
}

describe("title screen", () => {
  it("activating creates an audio context and calls onActivated with it", () => {
    const elements = stageElements();
    const audioContext = fakeAudioContext();
    const onActivated = vi.fn();

    initTitleScreen({
      elements,
      onActivated,
      createAudioContext: () => audioContext,
    });
    elements.startButton.click();

    expect(onActivated).toHaveBeenCalledTimes(1);
    expect(onActivated).toHaveBeenCalledWith(audioContext);
    expect(audioContext.resume).toHaveBeenCalled();
  });

  it("fades the title and activates the stage on click", () => {
    const elements = stageElements();

    initTitleScreen({
      elements,
      onActivated: vi.fn(),
      createAudioContext: fakeAudioContext,
    });
    elements.startButton.click();

    expect(elements.root.classList.contains("title-screen-fading")).toBe(true);
    expect(elements.stage.classList.contains("score-stage-active")).toBe(true);
  });

  it("does not activate twice on repeated clicks", () => {
    const elements = stageElements();
    const onActivated = vi.fn();

    initTitleScreen({ elements, onActivated, createAudioContext: fakeAudioContext });
    elements.startButton.click();
    elements.startButton.click();

    expect(onActivated).toHaveBeenCalledTimes(1);
  });

  it("destroy() stops the button from activating", () => {
    const elements = stageElements();
    const onActivated = vi.fn();

    const handles = initTitleScreen({
      elements,
      onActivated,
      createAudioContext: fakeAudioContext,
    });
    handles.destroy();
    elements.startButton.click();

    expect(onActivated).not.toHaveBeenCalled();
  });
});
