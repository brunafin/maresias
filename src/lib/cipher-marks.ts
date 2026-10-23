import { isChordToken } from "@/lib/clean-lyrics";

export type CipherMark = {
  stanza: number;
  line: number;
  word: number;
  gap: number;
  wordText: string;
  chord: string;
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
  const token = raw.trim().replace(/^[([|]+/g, "").replace(/[)\]|.,;:]+$/g, "");
  if (!token || token.length > MAX_CHORD || !isChordToken(token)) return null;
  return token[0].toUpperCase() + token.slice(1);
}

export function wordKey(word: { stanza: number; line: number; word: number }) {
  return `${word.stanza}:${word.line}:${word.word}`;
}

export function placeLabel(text: string, gap: number): string {
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

function clampGap(text: string, gap: number) {
  if (!Number.isInteger(gap) || gap < 0) return 0;
  return Math.min(gap, text.length);
}

function findInStanza(lines: LyricWord[][], mark: CipherMark, used: Set<string>): LyricWord | null {
  let best: LyricWord | null = null;
  let bestDist = Infinity;
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    for (const word of lines[lineIndex] ?? []) {
      if (word.text !== mark.wordText || used.has(wordKey(word))) continue;
      const dist = Math.abs(lineIndex - mark.line) * 100 + Math.abs(word.word - mark.word);
      if (dist < bestDist) {
        best = word;
        bestDist = dist;
      }
    }
  }
  return best;
}

function nearest(words: LyricWord[], text: string, used: Set<string>, wordIndex: number): LyricWord | null {
  let best: LyricWord | null = null;
  let bestDist = Infinity;
  for (const word of words) {
    if (word.text !== text || used.has(wordKey(word))) continue;
    const dist = Math.abs(word.word - wordIndex);
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
    if (exact && exact.text === mark.wordText && !used.has(wordKey(exact))) {
      found = exact;
    } else {
      const onLine = nearest(lines[mark.stanza]?.[mark.line] ?? [], mark.wordText, used, mark.word);
      found = onLine ?? findInStanza(lines[mark.stanza] ?? [], mark, used);
    }

    if (!found) {
      loose.push(mark);
      drifted = true;
      continue;
    }

    used.add(wordKey(found));
    const gap = clampGap(found.text, mark.gap);
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
  const byWord = new Map<string, CipherMark>();
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const raw = item as Record<string, unknown>;
    if (
      !isIndex(raw.stanza) ||
      !isIndex(raw.line) ||
      !isIndex(raw.word) ||
      !isIndex(raw.gap) ||
      typeof raw.wordText !== "string" ||
      typeof raw.chord !== "string"
    ) {
      return null;
    }
    const wordText = raw.wordText.trim().slice(0, MAX_WORD);
    const chord = normalizeChord(raw.chord);
    if (!wordText || !chord || raw.gap > wordText.length) return null;
    byWord.set(`${raw.stanza}:${raw.line}:${raw.word}`, {
      stanza: raw.stanza,
      line: raw.line,
      word: raw.word,
      gap: raw.gap,
      wordText,
      chord,
    });
  }
  return [...byWord.values()];
}
