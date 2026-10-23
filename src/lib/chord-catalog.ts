export const SCALE = ["C", "D", "E", "F", "G", "A", "B"] as const;

const SHARP_OF: Record<(typeof SCALE)[number], string | null> = {
  C: "C#",
  D: "D#",
  E: null,
  F: "F#",
  G: "G#",
  A: "A#",
  B: null,
};

export const CHORD_ROWS = [
  { id: "maior", label: "maior", minor: false, suffix: "" },
  { id: "menor", label: "menor", minor: true, suffix: "" },
  { id: "setima", label: "com sétima", minor: false, suffix: "7" },
] as const;

export function chordSymbol(root: string, row: { minor: boolean; suffix: string }) {
  const letter = root.charAt(0).toUpperCase();
  return letter + root.slice(1) + (row.minor ? "m" : "") + row.suffix;
}

export type ChordCell = { chord: string; label: string };

export type ChordLine = {
  id: string;
  label: string;
  cells: Array<ChordCell | null>;
};

function line(id: string, label: string, rootOf: (note: (typeof SCALE)[number]) => string | null, row: (typeof CHORD_ROWS)[number]): ChordLine {
  return {
    id,
    label,
    cells: SCALE.map((note) => {
      const root = rootOf(note);
      if (!root) return null;
      return { chord: chordSymbol(root, row), label };
    }),
  };
}

export function chordBoard(): ChordLine[] {
  const natural = CHORD_ROWS.map((row) => line(row.id, row.label, (note) => note, row));
  const sharp = CHORD_ROWS.map((row) =>
    line(
      `${row.id}-sustenido`,
      row.suffix === "7" ? "sétima com sustenido" : row.minor ? "menor com sustenido" : "maior com sustenido",
      (note) => SHARP_OF[note],
      row,
    ),
  );
  return [...natural, ...sharp];
}
