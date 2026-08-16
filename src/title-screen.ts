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

  elements.startButton.addEventListener("click", activate);

  return {
    destroy() {
      elements.startButton.removeEventListener("click", activate);
    },
  };
}
