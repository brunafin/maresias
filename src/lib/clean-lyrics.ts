const CHORD_TOKEN =
  /^(?:[A-G])(?:#|b)?(?:(?:maj|min|m|dim|aug|sus|add)\d{0,2}|\d{0,2}(?:sus\d{0,2})?(?:add\d{1,2})?)(?:\([^)]*\))?(?:\/[A-G](?:#|b)?)?$/i;

const WEAK_WORDS = new Set(["a", "e", "em", "o", "os", "as", "de", "da", "do"]);

function chordCore(raw: string): string {
  return raw.trim().replace(/^[([|]+/g, "").replace(/[)\]|.,;:]+$/g, "");
}

export function isChordToken(raw: string): boolean {
  const token = chordCore(raw);
  if (!token) return false;
  return CHORD_TOKEN.test(token);
}

function isStrongChord(raw: string): boolean {
  const token = chordCore(raw);
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

export function plainFromSynced(synced: string): string {
  const lines: string[] = [];
  for (const raw of synced.split(/\r?\n/)) {
    const withoutTime = raw.replace(/\[\d{1,2}:\d{2}(?:[.:]\d{1,3})?\]/g, "").trim();
    if (!withoutTime) continue;
    if (/^\[[^\]]+\]$/.test(withoutTime)) continue;
    lines.push(withoutTime);
  }
  return lines.join("\n");
}
