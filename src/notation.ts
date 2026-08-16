import {
  Articulation,
  Beam,
  Formatter,
  Modifier,
  Renderer,
  Stave,
  StaveNote,
  Stem,
  Voice,
} from "vexflow";
import type { RhythmPattern } from "./rhythm-model";

// VexFlow's percussion clef has lineShift: 0 relative to treble, so a
// standard treble-clef middle-line key still lands on the stave's middle
// line here. One abstract voice, one notehead position — see CLAUDE.md.
const NOTEHEAD_KEY = "b/4";
const INK_COLOR = "#25231f";

// Act III's real drum kit (EXHIBITION_FLOW.md section 8) reuses the same
// percussion-clef stave with conventional drum-set notehead positions: the
// hi-hat above the staff with a cross notehead, the snare on the middle
// line, and the kick on the bottom line — hi-hat/snare share the up-stem
// voice (VexFlow's per-key "note/octave/glyph-code" syntax lets one stem
// carry both a cross and a filled notehead when they coincide), the kick
// gets its own down-stem voice.
const HIHAT_KEY = "a/5/x2";
const SNARE_KEY = "b/4";
const KICK_KEY = "e/4";

// Act IV's bass voice (EXHIBITION_FLOW.md section 9) gets its own bass-clef
// staff below the drum staff, fixed at C3 for every note and rest — mirrors
// the kick's fixed-key convention so rest glyphs sit exactly where an active
// note would.
const BASS_KEY = "c/3";
const BASS_STAVE_GAP = 24;

export interface NoteBox {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface ScoreHandles {
  readonly svg: SVGSVGElement;
  // One box per eighth-note slot (0-7), in the same pixel space as
  // `container` — the hit-target/annotation overlay layers in main.ts use
  // these to position themselves over the actual noteheads VexFlow drew.
  // For a drum-kit pattern this is the hi-hat row's x-position (present in
  // every slot), spanning the full multi-voice staff height.
  readonly noteBoxes: readonly NoteBox[];
  // Per-slot notehead y-coordinate for the kick and (from Act IV) bass
  // voices, in the same pixel space as `container` — present only when that
  // voice exists in the pattern. main.ts's alignment-line/arc annotation
  // primitives draw between these rather than re-deriving stave geometry.
  readonly kickNoteYs?: readonly number[];
  readonly bassNoteYs?: readonly number[];
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

  // Centering the drum stave at `height / 2 - 40` works while it's the only
  // stave, but once a bass stave is drawn below it (from Act IV), centering
  // the pair means growing the container just pushes the frame's own top
  // edge up by the same amount the content shifts down — the bass stave's
  // absolute position on screen never actually moves closer to fitting.
  // Anchor near the top instead so extra container height becomes real
  // room below for the bass stave.
  const hasBassVoice = pattern.voices.some((voice) => voice.instrument === "bass");
  const staveWidth = Math.max(width - 20, 40);
  // 70 matches the y the single-stave case already lands on at its own
  // reference height (220 / 2 - 40) — the same above-stave clearance Act
  // III's hi-hat notation was already verified against, just fixed instead
  // of recomputed so it doesn't drift as the with-bass frame height changes.
  const stave = new Stave(10, hasBassVoice ? 70 : height / 2 - 40, staveWidth);
  stave.setStyle({ fillStyle: INK_COLOR, strokeStyle: INK_COLOR });
  stave.addClef("percussion");
  stave.addTimeSignature("4/4");
  stave.setContext(context).draw();

  const drawResult =
    pattern.voices.length > 1
      ? drawDrumKit(context, stave, pattern)
      : { noteBoxes: drawSingleVoice(context, stave, pattern) };

  const svg = container.querySelector("svg");
  if (!svg) throw new Error("VexFlow did not render an SVG element");

  return {
    svg,
    noteBoxes: drawResult.noteBoxes,
    kickNoteYs: drawResult.kickNoteYs,
    bassNoteYs: drawResult.bassNoteYs,
    destroy() {
      container.replaceChildren();
    },
  };
}

// getBoundingBox() needs canvas glyph-metrics that jsdom doesn't provide (and
// can be surprisingly tight in a real browser too, given the brief asks for
// *large* hit areas). Build a generous box instead, from tick-context
// x-positions and fixed stave-line geometry — neither touches text
// measurement. `aboveStave`/`belowStave` widen the vertical span for the
// drum kit's hi-hat row, which sits above the conventional 5-line staff.
function hitBoxes(
  stave: Stave,
  xs: readonly number[],
  aboveStave: number,
  belowStave: number,
): NoteBox[] {
  const boxTop = stave.getYForLine(0) - aboveStave;
  const boxHeight = stave.getYForLine(4) + belowStave - boxTop;
  return xs.map((x, index) => {
    const gapBefore = index > 0 ? x - xs[index - 1] : xs[1] - xs[0];
    const gapAfter = index < xs.length - 1 ? xs[index + 1] - x : x - xs[index - 1];
    const halfWidth = Math.min(gapBefore, gapAfter) / 2;
    return { x: x - halfWidth, y: boxTop, w: halfWidth * 2, h: boxHeight };
  });
}

function drawSingleVoice(
  context: ReturnType<Renderer["getContext"]>,
  stave: Stave,
  pattern: RhythmPattern,
): NoteBox[] {
  const slots = pattern.voices[0]?.slots ?? [];
  const notes = slots.map((slot) => {
    const note = new StaveNote({
      keys: [NOTEHEAD_KEY],
      duration: slot.duration,
      clef: "percussion",
    });
    note.setStyle({ fillStyle: INK_COLOR, strokeStyle: INK_COLOR });
    if (slot.accent) {
      note.addModifier(new Articulation("a>").setPosition(Modifier.Position.ABOVE));
    }
    return note;
  });

  if (notes.length === 0) return [];

  const voice = new Voice({
    numBeats: pattern.beatsPerBar,
    beatValue: pattern.beatUnit,
  }).setStrict(false);
  voice.addTickables(notes);

  // Must be constructed before voice.draw(): Beam calls setBeam() on each
  // note, which is what suppresses that note's individual flag. Built after
  // drawing, every note would render its own flag alongside the beam.
  const beam = new Beam(notes);
  beam.setStyle({ fillStyle: INK_COLOR, strokeStyle: INK_COLOR });

  new Formatter().joinVoices([voice]).formatToStave([voice], stave);
  voice.draw(context, stave);
  beam.setContext(context).draw();

  const xs = notes.map((note) => note.getAbsoluteX());
  return hitBoxes(stave, xs, 20, 10);
}

interface DrumKitDrawResult {
  readonly noteBoxes: NoteBox[];
  readonly kickNoteYs?: readonly number[];
  readonly bassNoteYs?: readonly number[];
}

function drawDrumKit(
  context: ReturnType<Renderer["getContext"]>,
  stave: Stave,
  pattern: RhythmPattern,
): DrumKitDrawResult {
  const hihat = pattern.voices.find((v) => v.instrument === "hihat-closed");
  const snare = pattern.voices.find((v) => v.instrument === "snare");
  const kick = pattern.voices.find((v) => v.instrument === "kick");
  const bass = pattern.voices.find((v) => v.instrument === "bass");
  const slotCount = hihat?.slots.length ?? 0;
  if (slotCount === 0) return { noteBoxes: [] };

  const upperNotes = Array.from({ length: slotCount }, (_, i) => {
    const keys: string[] = [];
    if (hihat?.slots[i]?.active) keys.push(HIHAT_KEY);
    if (snare?.slots[i]?.active) keys.push(SNARE_KEY);
    // A slot with neither voice active can't happen for this pattern (the
    // hi-hat plays every eighth), but guard defensively rather than hand
    // VexFlow a zero-key chord.
    const note = new StaveNote({
      keys: keys.length > 0 ? keys : [HIHAT_KEY],
      duration: "8",
      clef: "percussion",
      stemDirection: Stem.UP,
    });
    note.setStyle({ fillStyle: INK_COLOR, strokeStyle: INK_COLOR });
    return note;
  });

  const lowerNotes = Array.from({ length: slotCount }, (_, i) =>
    kick?.slots[i]?.active
      ? new StaveNote({
          keys: [KICK_KEY],
          duration: "8",
          clef: "percussion",
          stemDirection: Stem.DOWN,
        })
      : new StaveNote({
          keys: [KICK_KEY],
          duration: "8r",
          clef: "percussion",
        }),
  );
  lowerNotes.forEach((note) => note.setStyle({ fillStyle: INK_COLOR, strokeStyle: INK_COLOR }));

  let bassStave: Stave | null = null;
  let bassNotes: StaveNote[] | null = null;
  if (bass) {
    bassStave = new Stave(stave.getX(), stave.getBottomY() + BASS_STAVE_GAP, stave.getWidth());
    bassStave.setStyle({ fillStyle: INK_COLOR, strokeStyle: INK_COLOR });
    bassStave.addClef("bass");
    bassStave.setContext(context).draw();

    bassNotes = Array.from({ length: slotCount }, (_, i) =>
      bass.slots[i]?.active
        ? new StaveNote({
            keys: [BASS_KEY],
            duration: "8",
            clef: "bass",
            stemDirection: Stem.DOWN,
          })
        : new StaveNote({
            keys: [BASS_KEY],
            duration: "8r",
            clef: "bass",
          }),
    );
    bassNotes.forEach((note) => note.setStyle({ fillStyle: INK_COLOR, strokeStyle: INK_COLOR }));
  }

  const upperVoice = new Voice({
    numBeats: pattern.beatsPerBar,
    beatValue: pattern.beatUnit,
  }).setStrict(false);
  upperVoice.addTickables(upperNotes);

  const lowerVoice = new Voice({
    numBeats: pattern.beatsPerBar,
    beatValue: pattern.beatUnit,
  }).setStrict(false);
  lowerVoice.addTickables(lowerNotes);

  let bassVoice: Voice | null = null;
  if (bassNotes) {
    bassVoice = new Voice({
      numBeats: pattern.beatsPerBar,
      beatValue: pattern.beatUnit,
    }).setStrict(false);
    bassVoice.addTickables(bassNotes);
  }

  const upperBeam = new Beam(upperNotes);
  upperBeam.setStyle({ fillStyle: INK_COLOR, strokeStyle: INK_COLOR });

  // Only contiguous runs of two-or-more actual kick hits get beamed together;
  // an isolated hit renders its own flag, and rests never join a beam group.
  const kickBeams: Beam[] = [];
  let runStart = -1;
  for (let i = 0; i <= lowerNotes.length; i++) {
    const isRest = i === lowerNotes.length || !kick?.slots[i]?.active;
    if (!isRest) {
      if (runStart === -1) runStart = i;
    } else if (runStart !== -1) {
      if (i - runStart >= 2) {
        const beam = new Beam(lowerNotes.slice(runStart, i));
        beam.setStyle({ fillStyle: INK_COLOR, strokeStyle: INK_COLOR });
        kickBeams.push(beam);
      }
      runStart = -1;
    }
  }

  // Same contiguous-run beaming as the kick voice, applied to the bass.
  const bassBeams: Beam[] = [];
  if (bassNotes && bass) {
    let bassRunStart = -1;
    for (let i = 0; i <= bassNotes.length; i++) {
      const isRest = i === bassNotes.length || !bass.slots[i]?.active;
      if (!isRest) {
        if (bassRunStart === -1) bassRunStart = i;
      } else if (bassRunStart !== -1) {
        if (i - bassRunStart >= 2) {
          const beam = new Beam(bassNotes.slice(bassRunStart, i));
          beam.setStyle({ fillStyle: INK_COLOR, strokeStyle: INK_COLOR });
          bassBeams.push(beam);
        }
        bassRunStart = -1;
      }
    }
  }

  // Joining and formatting all voices together (keyed to the drum stave, the
  // widest of the two) keeps every eighth-note slot at the same x across
  // both staves — each voice is then drawn against its own stave so clefs
  // and stave lines render correctly per system.
  const voices = bassVoice ? [upperVoice, lowerVoice, bassVoice] : [upperVoice, lowerVoice];
  new Formatter().joinVoices(voices).formatToStave(voices, stave);
  upperVoice.draw(context, stave);
  lowerVoice.draw(context, stave);
  if (bassVoice && bassStave) bassVoice.draw(context, bassStave);
  upperBeam.setContext(context).draw();
  for (const beam of kickBeams) beam.setContext(context).draw();
  for (const beam of bassBeams) beam.setContext(context).draw();

  const xs = upperNotes.map((note) => note.getAbsoluteX());
  // The hi-hat sits a third-line above the staff, so the hit-target/cursor
  // overlay needs extra headroom above the stave that the single-voice path
  // doesn't (Act I/II never places a note there). When a bass staff is
  // present, extend the hit-area/annotation overlay all the way down through
  // it so it stays one continuous interactive region.
  const belowStave = bassStave ? bassStave.getBottomY() - stave.getYForLine(4) + 10 : 10;
  const noteBoxes = hitBoxes(stave, xs, 40, belowStave);

  const kickNoteYs = lowerNotes.map((note) => note.getYs()[0]);
  const bassNoteYs = bassNotes?.map((note) => note.getYs()[0]);

  return { noteBoxes, kickNoteYs, bassNoteYs };
}
