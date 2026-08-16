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

export interface NoteBox {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface ScoreHandles {
  readonly svg: SVGSVGElement;
  // One box per slot in `pattern.voices[0].slots`, in the same pixel space as
  // `container` — the hit-target/annotation overlay layers in main.ts use
  // these to position themselves over the actual noteheads VexFlow drew.
  readonly noteBoxes: readonly NoteBox[];
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

  let noteBoxes: NoteBox[] = [];

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

    // getBoundingBox() needs canvas glyph-metrics that jsdom doesn't provide
    // (and can be surprisingly tight in a real browser too, given the brief
    // asks for *large* hit areas). Build a generous box instead: full stave
    // height, spanning the midpoint between each note and its neighbours —
    // both come from tick-context x-positions and fixed stave-line geometry,
    // neither of which touches text measurement.
    const HIT_BOX_ABOVE_STAVE = 20;
    const HIT_BOX_BELOW_STAVE = 10;
    const boxTop = stave.getYForLine(0) - HIT_BOX_ABOVE_STAVE;
    const boxHeight =
      stave.getYForLine(4) + HIT_BOX_BELOW_STAVE - boxTop;

    const xs = notes.map((note) => note.getAbsoluteX());
    noteBoxes = xs.map((x, index) => {
      const gapBefore = index > 0 ? x - xs[index - 1] : xs[1] - xs[0];
      const gapAfter =
        index < xs.length - 1 ? xs[index + 1] - x : x - xs[index - 1];
      const halfWidth = Math.min(gapBefore, gapAfter) / 2;
      return { x: x - halfWidth, y: boxTop, w: halfWidth * 2, h: boxHeight };
    });
  }

  const svg = container.querySelector("svg");
  if (!svg) throw new Error("VexFlow did not render an SVG element");

  return {
    svg,
    noteBoxes,
    destroy() {
      container.replaceChildren();
    },
  };
}
