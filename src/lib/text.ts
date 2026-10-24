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

export function presentArtist(name: string): string {
  return name
    .replace(/\s*[,;&]?\s*\bcontinental\b/gi, "")
    .replace(/\s+&\s+/g, " e ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*$/g, "")
    .trim();
}

export function matchesFavorite(song: { title: string; artist: string }, query: string) {
  const needle = norm(query);
  if (!needle) return true;
  const artist = song.artist ?? "";
  return [song.title, artist, presentArtist(artist)].some((value) => norm(value).includes(needle));
}
