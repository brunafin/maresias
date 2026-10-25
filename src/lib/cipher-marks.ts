import { chordToken, isChordToken } from "@/lib/clean-lyrics";

export type CipherMark = {
  stanza: number;
  line: number;
  word: number;
  gap: number;
  wordText: string;
  chord: string;
  id?: string;
};

export type ChordSpot = {
  stanza: number;
  line: number;
  word: number;
  gap: number;
  wordText: string;
};

export type ChordCut = ChordSpot & {
  x: number;
  y: number;
};

export type ChordBox = {
  id: string;
  x: number;
  y: number;
  width: number;
};

export type LyricWord = {
  stanza: number;
  line: number;
  word: number;
  text: string;
};

const MAX_MARKS = 400;
const MAX_WORD = 80;
const MAX_CHORD = 24;
const MAX_INDEX = 10000;

export function lyricKey(lyrics: string): string {
  let hash = 5381;
  for (let i = 0; i < lyrics.length; i += 1) {
    hash = Math.imul(hash, 33) ^ lyrics.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

export function normalizeChord(raw: string): string | null {
  const token = chordToken(raw);
  if (!token || token.length > MAX_CHORD || !isChordToken(token)) return null;
  const match = /^([A-Ga-g])(#|b)?(.*)$/.exec(token);
  if (!match) return null;
  const letter = match[1].toUpperCase();
  const accidental = match[2] ?? "";
  let rest = match[3];
  if (/^min/i.test(rest)) rest = `m${rest.slice(3)}`;
  else if (/^m(?!aj)/i.test(rest)) rest = `m${rest.slice(1)}`;
  else if (match[1] === match[1].toLowerCase() && !/^maj/i.test(rest)) rest = `m${rest}`;
  const chord = letter + accidental + rest;
  if (!isChordToken(chord)) return null;
  return chord;
}

export function wordKey(word: { stanza: number; line: number; word: number }) {
  return `${word.stanza}:${word.line}:${word.word}`;
}

export function markKey(mark: { stanza: number; line: number; word: number; gap: number }) {
  return `${mark.stanza}:${mark.line}:${mark.word}:${mark.gap}`;
}

function sameRow(left: number, right: number) {
  return Math.abs(left - right) < 16;
}

export function cutBlocked(cut: ChordCut, width: number, chords: ChordBox[], selfId: string | null) {
  for (const chord of chords) {
    if (chord.id === selfId) continue;
    if (!sameRow(chord.y, cut.y)) continue;
    const end = chord.x + chord.width + 4;
    if (Math.abs(cut.x - chord.x) <= 0.5) return true;
    if (cut.x > chord.x + 0.5 && cut.x < end - 0.5) return true;
    if (width > 0 && cut.x < chord.x && cut.x + width + 4 > chord.x + 0.5) return true;
  }
  return false;
}

export function nearestOpenCut(x: number, y: number, cuts: ChordCut[], chords: ChordBox[], selfId: string | null, width: number) {
  let best: ChordCut | null = null;
  let bestDist = Infinity;
  for (const cut of cuts) {
    if (cutBlocked(cut, width, chords, selfId)) continue;
    const dx = cut.x - x;
    const dy = cut.y - y;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      best = cut;
      bestDist = dist;
    }
  }
  return best;
}

function readingOrder(left: ChordCut, right: ChordCut) {
  const row = Math.round(left.y / 8) - Math.round(right.y / 8);
  if (row !== 0) return row;
  return left.x - right.x;
}

export function nextOpenCut(anchor: ChordCut, cuts: ChordCut[], chords: ChordBox[], selfId: string | null, width: number) {
  const ordered = [...cuts].sort(readingOrder);
  const index = ordered.findIndex((cut) => markKey(cut) === markKey(anchor));
  const rest = index >= 0 ? ordered.slice(index + 1) : ordered.filter((cut) => readingOrder(anchor, cut) < 0);
  return rest.find((cut) => !cutBlocked(cut, width, chords, selfId)) ?? null;
}

export function previousOpenCut(anchor: ChordCut, cuts: ChordCut[], chords: ChordBox[], selfId: string | null, width: number) {
  const ordered = [...cuts].sort(readingOrder);
  const index = ordered.findIndex((cut) => markKey(cut) === markKey(anchor));
  const rest = index >= 0 ? ordered.slice(0, index) : [];
  for (let i = rest.length - 1; i >= 0; i -= 1) {
    const cut = rest[i];
    if (cut && !cutBlocked(cut, width, chords, selfId)) return cut;
  }
  return null;
}

function markIdentity(mark: CipherMark) {
  return `${mark.stanza}\n${mark.line}\n${mark.word}\n${mark.gap}\n${mark.wordText}\n${mark.chord}`;
}

export function sameMarks(left: CipherMark[], right: CipherMark[]) {
  if (left.length !== right.length) return false;
  const a = left.map(markIdentity).sort();
  const b = right.map(markIdentity).sort();
  return a.every((value, index) => value === b[index]);
}

export function placeLabel(text: string, gap: number): string {
  if (gap < 0) return "antes";
  if (gap <= 0) return "no começo";
  if (gap >= text.length) return "no fim";
  const letter = text[gap];
  return letter ? `antes de ${letter}` : "no fim";
}

export function lyricLines(stanzas: string[]): LyricWord[][][] {
  return stanzas.map((stanza, stanzaIndex) =>
    stanza.split("\n").map((line, lineIndex) => {
      const words: LyricWord[] = [];
      for (const text of line.split(/\s+/)) {
        if (!text) continue;
        words.push({ stanza: stanzaIndex, line: lineIndex, word: words.length, text });
      }
      return words;
    }),
  );
}

function isIndex(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < MAX_INDEX;
}

function clampGap(text: string, gap: number, wordIndex: number) {
  if (gap < 0) return wordIndex === 0 ? -1 : 0;
  if (!Number.isInteger(gap)) return 0;
  return Math.min(gap, text.length);
}

function seek(
  words: LyricWord[],
  text: string,
  gap: number,
  used: Set<string>,
  wordIndex: number,
  lineBias: number,
) {
  let best: LyricWord | null = null;
  let bestDist = Infinity;
  for (const word of words) {
    if (word.text !== text) continue;
    const nextGap = clampGap(word.text, gap, word.word);
    if (used.has(markKey({ ...word, gap: nextGap }))) continue;
    const dist = lineBias + Math.abs(word.word - wordIndex);
    if (dist < bestDist) {
      best = word;
      bestDist = dist;
    }
  }
  return best;
}

export function placeMarks(stanzas: string[], marks: CipherMark[]) {
  const lines = lyricLines(stanzas);
  const used = new Set<string>();
  const placed: CipherMark[] = [];
  const loose: CipherMark[] = [];
  let drifted = false;

  for (const mark of marks) {
    const exact = lines[mark.stanza]?.[mark.line]?.[mark.word];
    let found: LyricWord | null = null;
    if (exact && exact.text === mark.wordText && !used.has(markKey({ ...exact, gap: clampGap(exact.text, mark.gap, exact.word) }))) {
      found = exact;
    } else {
      const onLine = seek(lines[mark.stanza]?.[mark.line] ?? [], mark.wordText, mark.gap, used, mark.word, 0);
      if (onLine) found = onLine;
      else {
        let best: LyricWord | null = null;
        let bestDist = Infinity;
        const stanza = lines[mark.stanza] ?? [];
        for (let lineIndex = 0; lineIndex < stanza.length; lineIndex += 1) {
          const candidate = seek(stanza[lineIndex] ?? [], mark.wordText, mark.gap, used, mark.word, Math.abs(lineIndex - mark.line) * 100);
          if (!candidate) continue;
          const dist = Math.abs(lineIndex - mark.line) * 100 + Math.abs(candidate.word - mark.word);
          if (dist < bestDist) {
            best = candidate;
            bestDist = dist;
          }
        }
        found = best;
      }
    }

    if (!found) {
      loose.push(mark);
      drifted = true;
      continue;
    }

    const gap = clampGap(found.text, mark.gap, found.word);
    used.add(markKey({ ...found, gap }));
    if (
      found.stanza !== mark.stanza ||
      found.line !== mark.line ||
      found.word !== mark.word ||
      found.text !== mark.wordText ||
      gap !== mark.gap
    ) {
      drifted = true;
    }
    placed.push({
      ...(mark.id ? { id: mark.id } : {}),
      stanza: found.stanza,
      line: found.line,
      word: found.word,
      gap,
      wordText: found.text,
      chord: mark.chord,
    });
  }

  return { placed, loose, drifted };
}

export function readMarks(value: unknown): CipherMark[] | null {
  if (!Array.isArray(value) || value.length > MAX_MARKS) return null;
  const byPlace = new Map<string, CipherMark>();
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const raw = item as Record<string, unknown>;
    const lead = raw.gap === -1;
    if (
      !isIndex(raw.stanza) ||
      !isIndex(raw.line) ||
      !isIndex(raw.word) ||
      !(lead || isIndex(raw.gap)) ||
      typeof raw.wordText !== "string" ||
      typeof raw.chord !== "string"
    ) {
      return null;
    }
    const wordText = raw.wordText.trim().slice(0, MAX_WORD);
    const chord = normalizeChord(raw.chord);
    const gap = lead && raw.word !== 0 ? 0 : Number(raw.gap);
    if (!wordText || !chord || (gap !== -1 && gap > wordText.length)) return null;
    const mark = {
      stanza: raw.stanza,
      line: raw.line,
      word: raw.word,
      gap,
      wordText,
      chord,
    };
    byPlace.set(markKey(mark), mark);
  }
  return [...byPlace.values()];
}
