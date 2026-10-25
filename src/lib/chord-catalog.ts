export const NATURAL_CHORDS = ["A", "B", "C", "D", "E", "F", "G"] as const;

export type NaturalChord = (typeof NATURAL_CHORDS)[number];

const SHARP_OF: Record<NaturalChord, string | null> = {
  A: "A#",
  B: null,
  C: "C#",
  D: "D#",
  E: null,
  F: "F#",
  G: "G#",
};

export type ChordCell = { chord: string; label: string };

function isNatural(value: string): value is NaturalChord {
  return (NATURAL_CHORDS as readonly string[]).includes(value);
}

function chordSymbol(root: string, minor: boolean, suffix: string) {
  const letter = root.charAt(0).toUpperCase();
  return letter + root.slice(1) + (minor ? "m" : "") + suffix;
}

export function chordVariants(root: string): ChordCell[] {
  if (!isNatural(root)) return [];
  const cells: ChordCell[] = [
    { chord: chordSymbol(root, true, ""), label: "menor" },
    { chord: chordSymbol(root, false, "7"), label: "com sétima" },
  ];
  const sharp = SHARP_OF[root];
  if (!sharp) return cells;
  cells.push(
    { chord: chordSymbol(sharp, false, ""), label: "maior com sustenido" },
    { chord: chordSymbol(sharp, true, ""), label: "menor com sustenido" },
    { chord: chordSymbol(sharp, false, "7"), label: "sétima com sustenido" },
  );
  return cells;
}

export function chordFamily(chord: string): NaturalChord | null {
  if (isNatural(chord)) return chord;
  for (const note of NATURAL_CHORDS) {
    if (chordVariants(note).some((cell) => cell.chord === chord)) return note;
  }
  return null;
}
