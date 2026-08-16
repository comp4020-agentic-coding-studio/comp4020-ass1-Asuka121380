// The only place an AudioContext may be constructed anywhere in this app —
// see CLAUDE.md's "Where the Beat Leans" project rules.
export interface TitleScreenElements {
  readonly root: HTMLElement;
  readonly startButton: HTMLButtonElement;
  readonly stage: HTMLElement;
}

export interface TitleScreenOptions {
  readonly elements: TitleScreenElements;
  readonly onActivated: (audioContext: AudioContext) => void;
  // Injectable so tests can supply a fake AudioContext — jsdom has no
  // real Web Audio implementation.
  readonly createAudioContext?: () => AudioContext;
}

export interface TitleScreenHandles {
  destroy(): void;
  // Re-arms activation after a "return to title" navigation, so the exact
  // same first-time activation path (including a fresh AudioContext) can
  // run again on a subsequent click/keypress.
  reset(): void;
}

export function initTitleScreen(options: TitleScreenOptions): TitleScreenHandles {
  const { elements, onActivated } = options;
  const createAudioContext = options.createAudioContext ?? (() => new AudioContext());

  let activated = false;

  function activate(): void {
    if (activated) return;
    activated = true;

    const audioContext = createAudioContext();
    void audioContext.resume();

    elements.root.classList.add("title-screen-fading");
    elements.stage.classList.add("score-stage-active");

    onActivated(audioContext);
  }

  // The start surface is a real, focusable <button>, but native Enter/Space
  // semantics only fire once it already holds focus — nothing grants that on
  // page load, so a document-level listener is needed for the keys to
  // actually work while the title screen is active (not merely claimed to).
  function handleKeydown(event: KeyboardEvent): void {
    if (activated) return;
    if (event.key !== "Enter" && event.key !== " " && event.key !== "Spacebar") return;
    event.preventDefault();
    activate();
  }

  elements.startButton.addEventListener("click", activate);
  document.addEventListener("keydown", handleKeydown);

  return {
    destroy() {
      elements.startButton.removeEventListener("click", activate);
      document.removeEventListener("keydown", handleKeydown);
    },
    reset() {
      activated = false;
    },
  };
}
