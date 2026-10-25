const favoriteOrder = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

export function norm(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function countPhrase(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export function compareFavorites(a: { title: string; artist: string }, b: { title: string; artist: string }) {
  return favoriteOrder.compare(a.title, b.title) || favoriteOrder.compare(a.artist, b.artist);
}

const SMALL_WORDS = new Set([
  "a",
  "o",
  "as",
  "os",
  "um",
  "uma",
  "uns",
  "umas",
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "para",
  "por",
  "com",
  "que",
  "ao",
  "aos",
  "à",
  "às",
  "del",
  "la",
  "el",
  "los",
  "las",
  "y",
  "and",
  "of",
  "the",
  "feat",
  "ft",
  "vs",
]);

function isShouting(value: string): boolean {
  let upper = 0;
  let lower = 0;
  for (const char of value) {
    if (/\p{Ll}/u.test(char)) lower += 1;
    else if (/\p{Lu}/u.test(char)) upper += 1;
  }
  return lower === 0 && upper >= 2;
}

export function presentCase(value: string): string {
  if (!isShouting(value)) return value;
  return value.replace(/\p{L}+/gu, (word, offset) => {
    const before = value.slice(0, offset).replace(/.*[(\[{]/u, "");
    const first = !/\p{L}/u.test(before);
    const lower = word.toLocaleLowerCase("pt-BR");
    if (!first && SMALL_WORDS.has(lower)) return lower;
    if (word.length <= 4 && !/[aeiouyáàâãéêíóôõúü]/i.test(word)) {
      return word.toLocaleUpperCase("pt-BR");
    }
    return lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1);
  });
}

export function presentTitle(title: string): string {
  return presentCase(title).replace(/\s{2,}/g, " ").trim();
}

export function presentArtist(name: string): string {
  return presentCase(
    name
      .replace(/\s*[,;&]?\s*\bcontinental\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .replace(/\s+,/g, ",")
      .replace(/,\s*$/g, "")
      .trim(),
  ).replace(/\s+&\s+/g, " e ");
}

export function matchesFavorite(song: { title: string; artist: string }, query: string) {
  const needle = norm(query);
  if (!needle) return true;
  const artist = song.artist ?? "";
  return [song.title, artist, presentArtist(artist)].some((value) => norm(value).includes(needle));
}
