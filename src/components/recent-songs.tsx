"use client";

import { presentArtist, presentTitle } from "@/lib/text";
import Link from "next/link";
import { useSyncExternalStore } from "react";

const RECENT_KEY = "maresias-recentes";
const RECENT_LIMIT = 5;

export type RecentSong = {
  id: number;
  title: string;
  artist: string;
};

const songLinkClass =
  "flex min-h-20 flex-col justify-center rounded-2xl border-[3px] border-foreground bg-card px-5 py-4 text-foreground no-underline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-foreground active:translate-y-px";

const empty: RecentSong[] = [];
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedSongs: RecentSong[] = empty;

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function isRecentSong(value: unknown): value is RecentSong {
  if (!value || typeof value !== "object") return false;
  const song = value as RecentSong;
  return typeof song.id === "number" && typeof song.title === "string" && typeof song.artist === "string";
}

function parseRecent(raw: string | null): RecentSong[] {
  if (!raw) return empty;
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return empty;
    const songs = value.filter(isRecentSong).slice(0, RECENT_LIMIT);
    return songs.length ? songs : empty;
  } catch {
    return empty;
  }
}

function readRecent(): RecentSong[] {
  let raw: string | null;
  try {
    raw = localStorage.getItem(RECENT_KEY);
  } catch {
    return empty;
  }
  if (raw === cachedRaw) return cachedSongs;
  cachedRaw = raw;
  cachedSongs = parseRecent(raw);
  return cachedSongs;
}

export function rememberRecent(song: RecentSong) {
  const next = [song, ...readRecent().filter((item) => item.id !== song.id)].slice(0, RECENT_LIMIT);
  const raw = JSON.stringify(next);
  try {
    localStorage.setItem(RECENT_KEY, raw);
  } catch {
    return;
  }
  cachedRaw = raw;
  cachedSongs = next;
  emit();
}

export function RecentSongs() {
  const songs = useSyncExternalStore(subscribe, readRecent, () => empty);
  if (!songs.length) return null;

  return (
    <section aria-labelledby="recentes">
      <h2 id="recentes" className="text-3xl font-bold">
        Recentes
      </h2>
      <ul className="mt-4 flex flex-col gap-3">
        {songs.map((song) => (
          <li key={song.id}>
            <Link href={`/musica/${song.id}`} className={songLinkClass}>
              <span className="text-2xl font-bold leading-tight">{presentTitle(song.title)}</span>
              {song.artist ? <span className="mt-1 text-xl leading-snug">{presentArtist(song.artist)}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
