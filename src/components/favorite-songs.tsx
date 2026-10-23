"use client";

import { CipherBadge } from "@/components/cipher-badge";
import { Input } from "@/components/ui/input";
import type { SavedSong } from "@/lib/favorites";
import { compareFavorites, matchesFavorite, presentArtist } from "@/lib/text";
import Link from "next/link";
import { useState, type FormEvent } from "react";

const songLinkClass =
  "flex min-h-20 items-center gap-4 rounded-2xl border-[3px] border-foreground bg-card px-5 py-4 text-foreground no-underline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-foreground active:translate-y-px";

export function FavoriteSongs({ songs }: { songs: SavedSong[] }) {
  const [query, setQuery] = useState("");
  const visible = [...songs].sort(compareFavorites).filter((song) => matchesFavorite(song, query));

  function onSubmit(event: FormEvent) {
    event.preventDefault();
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={onSubmit} role="search">
        <label htmlFor="favoritas-busca" className="sr-only">
          Buscar por música ou cantor
        </label>
        <Input
          id="favoritas-busca"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Música ou cantor"
          autoComplete="off"
          autoCorrect="off"
          enterKeyHint="search"
          className="h-20 rounded-2xl border-[3px] bg-card px-5 text-3xl placeholder:text-3xl placeholder:text-foreground/70 md:text-3xl"
        />
      </form>

      {visible.length === 0 ? (
        <p className="text-2xl leading-snug">Nenhuma favorita com esse nome ou cantor.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((song) => (
            <li key={song.id}>
              <Link href={`/musica/${song.id}`} className={songLinkClass}>
                <span className="flex min-w-0 flex-1 flex-col justify-center">
                  <span className="text-2xl font-bold leading-tight">{song.title}</span>
                  {song.artist ? <span className="mt-1 text-xl leading-snug">{presentArtist(song.artist)}</span> : null}
                </span>
                {song.ciphered ? <CipherBadge /> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
