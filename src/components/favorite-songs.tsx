"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SavedSong } from "@/lib/favorites";
import { norm, presentArtist } from "@/lib/text";
import Link from "next/link";
import { useState, type FormEvent } from "react";

const songLinkClass =
  "flex min-h-20 flex-col justify-center rounded-2xl border-[3px] border-foreground bg-card px-5 py-4 text-foreground no-underline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-foreground active:translate-y-px";

const clearClass =
  "h-auto min-h-16 w-full touch-manipulation rounded-2xl border-[3px] border-foreground px-4 py-3 text-center text-xl font-bold leading-tight focus-visible:ring-4";

export function FavoriteSongs({ songs }: { songs: SavedSong[] }) {
  const [query, setQuery] = useState("");
  const needle = norm(query);
  const visible = needle ? songs.filter((song) => norm(song.title).includes(needle)) : songs;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" role="search">
        <label htmlFor="favoritas-busca" className="sr-only">
          Buscar pelo nome
        </label>
        <Input
          id="favoritas-busca"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nome da música"
          autoComplete="off"
          autoCorrect="off"
          enterKeyHint="search"
          className="h-20 rounded-2xl border-[3px] bg-card px-5 text-3xl placeholder:text-3xl placeholder:text-foreground/70 md:text-3xl"
        />
        <Button type="button" variant="outline" size="grande" className={clearClass} onClick={() => setQuery("")}>
          Limpar
        </Button>
      </form>

      {visible.length === 0 ? (
        <p className="text-2xl leading-snug">Nenhuma favorita com esse nome.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((song) => (
            <li key={song.id}>
              <Link href={`/musica/${song.id}`} className={songLinkClass}>
                <span className="text-2xl font-bold leading-tight">{song.title}</span>
                {song.artist ? <span className="mt-1 text-xl leading-snug">{presentArtist(song.artist)}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
