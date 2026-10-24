import type { CipherMark } from "@/lib/cipher-marks";

const SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
const FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] as const;

const PITCH: Record<string, number> = {};
for (let index = 0; index < 12; index += 1) {
  PITCH[SHARP[index]] = index;
  PITCH[FLAT[index]] = index;
}

const CHORD = /^([A-G])(#|b)?(.*?)(?:\/([A-G])(#|b)?)?$/;

export function wrapSemitone(steps: number) {
  let cycle = steps % 12;
  if (cycle > 6) cycle -= 12;
  if (cycle < -6) cycle += 12;
  return cycle;
}

function spelling(marks: CipherMark[], steps: number): "sharp" | "flat" {
  let sharps = 0;
  let flats = 0;
  for (const mark of marks) {
    const match = CHORD.exec(mark.chord);
    if (!match) continue;
    if (match[2] === "#") sharps += 1;
    else if (match[2] === "b") flats += 1;
    if (match[5] === "#") sharps += 1;
    else if (match[5] === "b") flats += 1;
  }
  if (flats > sharps) return "flat";
  if (sharps > flats) return "sharp";
  return steps < 0 ? "flat" : "sharp";
}

function spell(note: string, accidental: string, steps: number, style: "sharp" | "flat") {
  const pitch = PITCH[note + accidental];
  if (pitch === undefined) return null;
  const names = style === "flat" ? FLAT : SHARP;
  return names[(pitch + steps + 12) % 12];
}

export function transposeChord(chord: string, steps: number, style: "sharp" | "flat") {
  const match = CHORD.exec(chord);
  if (!match) return chord;
  const root = spell(match[1], match[2] ?? "", steps, style);
  if (!root) return chord;
  const bass = match[4] ? spell(match[4], match[5] ?? "", steps, style) : "";
  if (match[4] && !bass) return chord;
  return root + (match[3] ?? "") + (bass ? `/${bass}` : "");
}

export function transposeMarks(marks: CipherMark[], semitones: number) {
  const steps = wrapSemitone(semitones);
  if (steps === 0 || marks.length === 0) return marks;
  const style = spelling(marks, steps);
  let changed = false;
  const next = marks.map((mark) => {
    const chord = transposeChord(mark.chord, steps, style);
    if (chord === mark.chord) return mark;
    changed = true;
    return { ...mark, chord };
  });
  return changed ? next : marks;
}
