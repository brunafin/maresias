export type ChordFrets = [number, number, number, number, number, number];

export type ChordPosition = {
  frets: ChordFrets;
  barre: { fret: number; from: number; to: number } | null;
};

const PITCH: Record<string, number> = {
  C: 0,
  "C#": 1,
  D: 2,
  "D#": 3,
  E: 4,
  F: 5,
  "F#": 6,
  G: 7,
  "G#": 8,
  A: 9,
  "A#": 10,
  B: 11,
};

const FLAT_TO_SHARP: Record<string, string> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
};

const OPEN_MIDI = [40, 45, 50, 55, 59, 64];

const OPEN: Record<string, ChordFrets> = {
  C: [-1, 3, 2, 0, 1, 0],
  C7: [-1, 3, 2, 3, 1, 0],
  C9: [-1, 3, 2, 3, 3, 3],
  D: [-1, -1, 0, 2, 3, 2],
  Dm: [-1, -1, 0, 2, 3, 1],
  D7: [-1, -1, 0, 2, 1, 2],
  Dm7: [-1, -1, 0, 2, 1, 1],
  G: [3, 2, 0, 0, 0, 3],
  G7: [3, 2, 0, 0, 0, 1],
  G9: [3, 2, 0, 2, 0, 1],
  B7: [-1, 2, 1, 2, 0, 2],
};

type Quality = "" | "m" | "7" | "m7" | "9";

function rootFrets(openPitch: number, rootPitch: number) {
  const base = (rootPitch - openPitch + 12) % 12;
  return base === 0 ? [0, 12] : [base];
}

function eShape(fret: number, quality: Quality): ChordPosition {
  const frets: ChordFrets =
    quality === "m"
      ? [fret, fret + 2, fret + 2, fret, fret, fret]
      : quality === "m7"
        ? [fret, fret + 2, fret, fret, fret, fret]
        : quality === "7"
          ? [fret, fret + 2, fret, fret + 1, fret, fret]
          : quality === "9"
            ? [fret, fret + 2, fret, fret + 1, fret, fret + 2]
            : [fret, fret + 2, fret + 2, fret + 1, fret, fret];
  return { frets, barre: fret > 0 ? { fret, from: 0, to: 5 } : null };
}

function aShape(fret: number, quality: Quality): ChordPosition {
  const frets: ChordFrets =
    quality === "m"
      ? [-1, fret, fret + 2, fret + 2, fret + 1, fret]
      : quality === "m7"
        ? [-1, fret, fret + 2, fret, fret + 1, fret]
        : quality === "7"
          ? [-1, fret, fret + 2, fret, fret + 2, fret]
          : quality === "9"
            ? [-1, fret, fret + 2, fret + 4, fret + 2, fret + 3]
            : [-1, fret, fret + 2, fret + 2, fret + 2, fret];
  const barre = quality === "9" || fret === 0 ? null : { fret, from: 1, to: 5 };
  return { frets, barre };
}

function rank(position: ChordPosition) {
  let lowest = Infinity;
  let highest = 0;
  for (let string = 0; string < position.frets.length; string += 1) {
    const fret = position.frets[string];
    if (fret < 0) continue;
    lowest = Math.min(lowest, OPEN_MIDI[string] + fret);
    highest = Math.max(highest, fret);
  }
  return lowest * 100 + highest;
}

function sameFrets(left: ChordFrets, right: ChordFrets) {
  return left.every((fret, index) => fret === right[index]);
}

export function chordPositions(symbol: string): ChordPosition[] {
  const match = /^([A-G])(#|b)?(m7|m|7|9)?$/.exec(symbol);
  if (!match) return [];
  let root = match[1] + (match[2] ?? "");
  if (match[2] === "b") {
    const sharp = FLAT_TO_SHARP[root];
    if (!sharp) return [];
    root = sharp;
  }
  const pitch = PITCH[root];
  if (pitch === undefined) return [];
  const quality = (match[3] ?? "") as Quality;
  const name = root + quality;
  const positions: ChordPosition[] = [];
  const open = OPEN[name];
  if (open) positions.push({ frets: open, barre: null });
  for (const fret of rootFrets(PITCH.E, pitch)) positions.push(eShape(fret, quality));
  for (const fret of rootFrets(PITCH.A, pitch)) positions.push(aShape(fret, quality));
  const unique = positions.filter(
    (position, index) => positions.findIndex((other) => sameFrets(other.frets, position.frets)) === index,
  );
  unique.sort((left, right) => rank(left) - rank(right));
  return unique.slice(0, 3);
}
