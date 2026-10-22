import { cleanLyrics, plainFromSynced } from "@/lib/clean-lyrics";
import { norm, presentArtist } from "@/lib/text";

const USER_AGENT = "LetrasDaRoda/1.0 (pagina de letras para canto em grupo)";
const MIN_LYRICS = 40;

export type LyricSource = "lrclib" | "lyrics.ovh";

export type LyricRecord = {
  id: number | null;
  artist: string;
  title: string;
  album: string;
  lyrics: string;
  source: LyricSource;
};

export type SearchHit = {
  id: number;
  artist: string;
  title: string;
  album: string;
};

type LrclibRecord = {
  id: number;
  trackName?: string;
  artistName?: string;
  albumName?: string;
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
};

const memory = new Map<string, { at: number; value: LyricRecord }>();
const MEMORY_MS = 10 * 60 * 1000;

function remember(key: string, value: LyricRecord): LyricRecord {
  memory.set(key, { at: Date.now(), value });
  return value;
}

function recall(key: string): LyricRecord | null {
  const hit = memory.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > MEMORY_MS) {
    memory.delete(key);
    return null;
  }
  return hit.value;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRecord(value: unknown): value is LrclibRecord {
  if (!value || typeof value !== "object") return false;
  return typeof (value as LrclibRecord).id === "number";
}

async function fetchJson(url: string): Promise<{ status: number; data: unknown }> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": USER_AGENT,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      });
      if (response.status === 429 || response.status === 502 || response.status === 503) {
        lastError = new Error(`status ${response.status}`);
        await delay(400 * (attempt + 1));
        continue;
      }
      const text = await response.text();
      let data: unknown = null;
      if (text) {
        try {
          data = JSON.parse(text) as unknown;
        } catch {
          data = null;
        }
      }
      return { status: response.status, data };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("rede");
      await delay(400 * (attempt + 1));
    }
  }
  throw lastError ?? new Error("rede");
}

function textFromRecord(record: LrclibRecord): string {
  if (record.instrumental) return "";
  const plain = record.plainLyrics?.trim();
  if (plain) return cleanLyrics(record.plainLyrics ?? "");
  const synced = record.syncedLyrics?.trim();
  if (synced) return cleanLyrics(plainFromSynced(record.syncedLyrics ?? ""));
  return "";
}

function toLyric(record: LrclibRecord, lyrics: string, source: LyricSource): LyricRecord {
  return {
    id: record.id,
    artist: presentArtist(record.artistName ?? ""),
    title: (record.trackName ?? "").trim(),
    album: (record.albumName ?? "").trim(),
    lyrics,
    source,
  };
}

async function lyricsOvh(artist: string, title: string): Promise<string> {
  const artistName = artist.trim();
  const trackName = title.trim();
  if (!artistName || !trackName) return "";
  const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artistName)}/${encodeURIComponent(trackName)}`;
  try {
    const { status, data } = await fetchJson(url);
    if (status !== 200 || !data || typeof data !== "object") return "";
    const lyrics = (data as { lyrics?: unknown }).lyrics;
    if (typeof lyrics !== "string") return "";
    return cleanLyrics(lyrics);
  } catch {
    return "";
  }
}

async function searchLrclib(params: Record<string, string>): Promise<LrclibRecord[]> {
  const url = `https://lrclib.net/api/search?${new URLSearchParams(params)}`;
  const { status, data } = await fetchJson(url);
  if (status >= 500) throw new Error("unavailable");
  if (!Array.isArray(data)) return [];
  return data.filter(isRecord);
}

function scoreRecord(record: LrclibRecord, artist: string, title: string): number {
  const wantTitle = norm(title);
  const wantArtist = norm(artist);
  const gotTitle = norm(record.trackName ?? "");
  const gotArtist = norm(record.artistName ?? "");
  if (!wantTitle || !gotTitle) return -1;
  let score = 0;
  if (gotTitle === wantTitle) score += 60;
  else if (gotTitle.includes(wantTitle) || wantTitle.includes(gotTitle)) score += 30;
  else return -1;
  if (wantArtist && (gotArtist.includes(wantArtist) || wantArtist.includes(gotArtist))) {
    score += 30;
  }
  const text = textFromRecord(record);
  if (text.length < MIN_LYRICS) return -1;
  return score + Math.min(15, Math.floor(text.length / 250));
}

async function searchBest(
  artist: string,
  title: string,
  skipId?: number,
): Promise<LyricRecord | null> {
  const records = await searchLrclib({
    track_name: title,
    artist_name: artist,
  });
  let best: LrclibRecord | null = null;
  let bestScore = -1;
  for (const record of records) {
    if (skipId !== undefined && record.id === skipId) continue;
    const score = scoreRecord(record, artist, title);
    if (score > bestScore) {
      best = record;
      bestScore = score;
    }
  }
  if (!best || bestScore < 0) return null;
  const lyrics = textFromRecord(best);
  if (lyrics.length < MIN_LYRICS) return null;
  return toLyric(best, lyrics, "lrclib");
}

export async function getLyricsById(id: number): Promise<LyricRecord | null> {
  const key = `id:${id}`;
  const cached = recall(key);
  if (cached) return cached;

  const { status, data } = await fetchJson(`https://lrclib.net/api/get/${id}`);
  if (status === 404) return null;
  if (status >= 400 || !isRecord(data)) throw new Error("unavailable");

  const record = data;
  let lyrics = textFromRecord(record);
  let source: LyricSource = "lrclib";
  if (lyrics.length < MIN_LYRICS) {
    const alt = await searchBest(record.artistName ?? "", record.trackName ?? "", record.id);
    if (alt) return remember(key, alt);
    const ovh = await lyricsOvh(record.artistName ?? "", record.trackName ?? "");
    if (ovh.length >= MIN_LYRICS) {
      lyrics = ovh;
      source = "lyrics.ovh";
    }
  }
  if (lyrics.length < MIN_LYRICS) return null;
  return remember(key, toLyric(record, lyrics, source));
}

export async function getLyricsByArtistTitle(
  artist: string,
  title: string,
): Promise<LyricRecord | null> {
  const key = `q:${norm(artist)}|${norm(title)}`;
  const cached = recall(key);
  if (cached) return cached;

  const best = await searchBest(artist, title);
  if (best) return remember(key, best);
  const ovh = await lyricsOvh(artist, title);
  if (ovh.length < MIN_LYRICS) return null;
  return remember(key, {
    id: null,
    artist: presentArtist(artist),
    title: title.trim(),
    album: "",
    lyrics: ovh,
    source: "lyrics.ovh",
  });
}

export async function searchSongs(query: string): Promise<SearchHit[]> {
  const q = query.trim().slice(0, 120);
  if (q.length < 2) return [];
  const records = await searchLrclib({ q });
  const seen = new Set<string>();
  const hits: SearchHit[] = [];
  for (const record of records) {
    if (textFromRecord(record).length < MIN_LYRICS) continue;
    const artist = presentArtist(record.artistName ?? "");
    const title = (record.trackName ?? "").trim();
    if (!artist || !title) continue;
    const key = `${norm(artist)}|${norm(title)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    hits.push({
      id: record.id,
      artist,
      title,
      album: (record.albumName ?? "").trim(),
    });
    if (hits.length >= 8) break;
  }
  return hits;
}
