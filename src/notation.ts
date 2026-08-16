import {
  Articulation,
  Beam,
  Formatter,
  Modifier,
  Renderer,
  Stave,
  StaveNote,
  Voice,
} from "vexflow";
import type { RhythmPattern } from "./rhythm-model";

// VexFlow's percussion clef has lineShift: 0 relative to treble, so a
// standard treble-clef middle-line key still lands on the stave's middle
// line here. One abstract voice, one notehead position — see CLAUDE.md.
const NOTEHEAD_KEY = "b/4";
const INK_COLOR = "#25231f";

export interface ScoreHandles {
  readonly svg: SVGSVGElement;
  destroy(): void;
}

export function renderPulseScore(
  container: HTMLDivElement,
  pattern: RhythmPattern,
): ScoreHandles {
  container.replaceChildren();

  const width = container.clientWidth || 320;
  const height = container.clientHeight || 200;

  const renderer = new Renderer(container, Renderer.Backends.SVG);
  renderer.resize(width, height);
  const context = renderer.getContext();
  context.setFillStyle(INK_COLOR);
  context.setStrokeStyle(INK_COLOR);

  const staveWidth = Math.max(width - 20, 40);
  const stave = new Stave(10, height / 2 - 40, staveWidth);
  stave.setStyle({ fillStyle: INK_COLOR, strokeStyle: INK_COLOR });
  stave.addClef("percussion");
  stave.addTimeSignature("4/4");
  stave.setContext(context).draw();

  const slots = pattern.voices[0]?.slots ?? [];
  const notes = slots.map((slot) => {
    const note = new StaveNote({
      keys: [NOTEHEAD_KEY],
      duration: slot.duration,
      clef: "percussion",
    });
    note.setStyle({ fillStyle: INK_COLOR, strokeStyle: INK_COLOR });
    if (slot.accent) {
      note.addModifier(
        new Articulation("a>").setPosition(Modifier.Position.ABOVE),
      );
    }
    return note;
  });

  if (notes.length > 0) {
    const voice = new Voice({
      numBeats: pattern.beatsPerBar,
      beatValue: pattern.beatUnit,
    }).setStrict(false);
    voice.addTickables(notes);

    // Must be constructed before voice.draw(): Beam calls setBeam() on each
    // note, which is what suppresses that note's individual flag. Built
    // after drawing, every note would render its own flag alongside the beam.
    const beam = new Beam(notes);
    beam.setStyle({ fillStyle: INK_COLOR, strokeStyle: INK_COLOR });

    new Formatter().joinVoices([voice]).formatToStave([voice], stave);
    voice.draw(context, stave);
    beam.setContext(context).draw();
  }

  const svg = container.querySelector("svg");
  if (!svg) throw new Error("VexFlow did not render an SVG element");

  return {
    svg,
    destroy() {
      container.replaceChildren();
    },
  };
}
