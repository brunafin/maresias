export function norm(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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
