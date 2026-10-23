const CHORD_TOKEN =
  /^(?:[A-G])(?:#|b)?(?:(?:maj|min|m|dim|aug|sus|add)\d{0,2}|\d{0,2}(?:sus\d{0,2})?(?:add\d{1,2})?)(?:\([^)]*\))?(?:\/[A-G](?:#|b)?)?$/i;

const WEAK_WORDS = new Set(["a", "e", "em", "o", "os", "as", "de", "da", "do"]);

export function chordToken(raw: string): string {
  let token = raw.trim().replace(/^[([|]+/g, "");
  let previous = "";
  while (token && token !== previous) {
    previous = token;
    token = token.replace(/[\]|.,;:]+$/g, "");
    let opens = 0;
    let closes = 0;
    for (const char of token) {
      if (char === "(") opens += 1;
      else if (char === ")") closes += 1;
    }
    if (token.endsWith(")") && closes > opens) token = token.slice(0, -1);
  }
  return token;
}

export function isChordToken(raw: string): boolean {
  const token = chordToken(raw);
  if (!token) return false;
  return CHORD_TOKEN.test(token);
}

function isStrongChord(raw: string): boolean {
  const token = chordToken(raw);
  if (!isChordToken(token)) return false;
  if (WEAK_WORDS.has(token.toLowerCase())) return false;
  return /[#b0-9]|sus|dim|aug|maj|add|m/i.test(token);
}

export function isChordLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || !tokens.every((token) => isChordToken(token))) {
    return false;
  }
  if (tokens.some((token) => isStrongChord(token))) return true;
  return tokens.length >= 3;
}

function stripBracketChords(line: string): string {
  return line
    .replace(/\[([^\]\n]+)\]/g, (full, inner: string) => {
      const parts = inner.trim().split(/\s+/).filter(Boolean);
      if (parts.length > 0 && parts.every((part) => isChordToken(part))) {
        return "";
      }
      return full;
    })
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function cleanLyrics(raw: string): string {
  const lines = raw
    .replace(/\uFEFF/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n");
  const kept: string[] = [];
  for (const line of lines) {
    if (isChordLine(line)) continue;
    if (/^[\s|.\-–—/\\*_=~]+$/.test(line)) {
      kept.push("");
      continue;
    }
    kept.push(stripBracketChords(line));
  }
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function plainWord(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z]/g, "");
}

function lastWord(line: string): string {
  const match = line.trim().match(/[\p{L}\p{N}]+$/u);
  return match?.[0] ?? "";
}

const RHYME_PAIRS = new Set(["ar", "er", "ir", "or", "ur", "az", "ez", "iz", "oz", "uz"]);

function rhymeForms(raw: string): string[] {
  const word = plainWord(raw);
  if (word.length > 3 && word.endsWith("s")) return [word, word.slice(0, -1)];
  return [word];
}

function linesRhyme(left: string, right: string): boolean {
  const keys = new Map<string, number>();
  for (const form of rhymeForms(lastWord(left))) {
    for (const size of [4, 3, 2]) {
      if (form.length >= size) keys.set(form.slice(-size), size);
    }
  }
  let best = 0;
  let ending = "";
  for (const form of rhymeForms(lastWord(right))) {
    for (const size of [4, 3, 2]) {
      if (form.length < size) continue;
      const tail = form.slice(-size);
      if (keys.has(tail) && size > best) {
        best = size;
        ending = tail;
      }
    }
  }
  if (best >= 3) return true;
  return best === 2 && (RHYME_PAIRS.has(ending) || /[aeiou]{2}/.test(ending));
}

function groupsRhyme(lines: string[], size: number, pairs: number[]): boolean {
  if (lines.length < size * 2 || lines.length % size !== 0) return false;
  for (let start = 0; start < lines.length; start += size) {
    for (let i = 0; i < pairs.length; i += 2) {
      const left = lines[start + (pairs[i] ?? 0)] ?? "";
      const right = lines[start + (pairs[i + 1] ?? 0)] ?? "";
      if (!linesRhyme(left, right)) return false;
    }
  }
  return true;
}

function stanzaSize(lines: string[]): number | null {
  if (groupsRhyme(lines, 4, [0, 1, 2, 3])) return 4;
  if (groupsRhyme(lines, 4, [0, 2, 1, 3])) return 4;
  if (groupsRhyme(lines, 4, [1, 3])) return 4;
  if (groupsRhyme(lines, 4, [0, 3, 1, 2])) return 4;
  if (groupsRhyme(lines, 2, [0, 1])) return 2;
  return null;
}

function isQuatrain(lines: string[]): boolean {
  if (lines.length !== 4) return false;
  const schemes = [
    [0, 1, 2, 3],
    [0, 2, 1, 3],
    [1, 3],
    [0, 3, 1, 2],
  ];
  return schemes.some((pairs) => {
    for (let i = 0; i < pairs.length; i += 2) {
      if (!linesRhyme(lines[pairs[i] ?? 0] ?? "", lines[pairs[i + 1] ?? 0] ?? "")) return false;
    }
    return true;
  });
}

function normLine(line: string): string {
  return line
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function nonOverlapping(starts: number[], length: number): number[] {
  const picked: number[] = [];
  let end = -1;
  for (const start of [...starts].sort((a, b) => a - b)) {
    if (start < end) continue;
    picked.push(start);
    end = start + length;
  }
  return picked;
}

function repeatedBlock(lines: string[]): { length: number; starts: number[] } | null {
  const keys = lines.map(normLine);
  let best: { length: number; starts: number[] } | null = null;
  for (let length = Math.min(8, keys.length - 1); length >= 3; length -= 1) {
    const seen = new Map<string, number[]>();
    for (let i = 0; i + length <= keys.length; i += 1) {
      const key = keys.slice(i, i + length).join("\n");
      const list = seen.get(key) ?? [];
      list.push(i);
      seen.set(key, list);
    }
    for (const starts of seen.values()) {
      const picked = nonOverlapping(starts, length);
      if (picked.length < 2) continue;
      const covered = picked.length * length;
      const bestCovered = best ? best.starts.length * best.length : 0;
      const moreOften = best ? picked.length > best.starts.length : false;
      const sameOftenAndLarger = best ? picked.length === best.starts.length && covered > bestCovered : false;
      if (!best || moreOften || sameOftenAndLarger) {
        best = { length, starts: picked };
      }
    }
  }
  return best;
}

function splitGap(lines: string[]): string[][] {
  const stanzas: string[][] = [];
  let index = 0;
  while (index < lines.length) {
    const rest = lines.length - index;
    if (rest >= 4 && rest !== 5 && isQuatrain(lines.slice(index, index + 4))) {
      stanzas.push(lines.slice(index, index + 4));
      index += 4;
      continue;
    }
    stanzas.push(lines.slice(index));
    break;
  }
  return stanzas.filter((stanza) => stanza.length > 0);
}

function blocksOf(lines: string[]): string[][] {
  const size = stanzaSize(lines);
  if (size) {
    const blocks: string[][] = [];
    for (let i = 0; i < lines.length; i += size) blocks.push(lines.slice(i, i + size));
    return blocks;
  }
  const repeated = repeatedBlock(lines);
  if (!repeated) return [lines];
  const blocks: string[][] = [];
  let cursor = 0;
  for (const start of repeated.starts) {
    if (start > cursor) blocks.push(...splitGap(lines.slice(cursor, start)));
    blocks.push(lines.slice(start, start + repeated.length));
    cursor = start + repeated.length;
  }
  if (cursor < lines.length) blocks.push(...splitGap(lines.slice(cursor)));
  return blocks;
}

function withStanzaBreaks(lyrics: string): string {
  if (/\n\s*\n/.test(lyrics)) return lyrics;
  const lines = lyrics
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 8) return lyrics;
  return blocksOf(lines)
    .map((block) => block.join("\n"))
    .join("\n\n");
}

export function lyricStanzas(lyrics: string): string[] {
  return withStanzaBreaks(lyrics)
    .split(/\n{2,}/)
    .map((stanza) => stanza.trim())
    .filter(Boolean);
}

export function plainFromSynced(synced: string): string {
  const lines: string[] = [];
  for (const raw of synced.split(/\r?\n/)) {
    const withoutTime = raw.replace(/\[\d{1,2}:\d{2}(?:[.:]\d{1,3})?\]/g, "").trim();
    if (!withoutTime) {
      lines.push("");
      continue;
    }
    if (/^\[[^\]]+\]$/.test(withoutTime)) continue;
    lines.push(withoutTime);
  }
  return lines.join("\n");
}
