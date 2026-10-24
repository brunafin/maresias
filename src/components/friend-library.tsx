"use client";

import { CipherBadge } from "@/components/cipher-badge";
import { BackLink } from "@/components/controls";
import { SongFilter, type SongFilterValue } from "@/components/song-filter";
import { compareFavorites, countPhrase, presentArtist } from "@/lib/text";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Song = {
  id: number;
  title: string;
  artist: string;
  ciphered?: boolean;
};

type Person = {
  self: boolean;
  nickname: string;
  name: string | null;
  favorites: Song[];
  ciphers: Song[];
};

type Library =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error" }
  | { status: "ready"; person: Person };

const songLinkClass =
  "flex min-h-20 items-center gap-4 rounded-2xl border-[3px] border-foreground bg-card px-5 py-4 text-foreground no-underline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-foreground active:translate-y-px";

export function FriendLibrary({ nickname }: { nickname: string }) {
  const router = useRouter();
  const [state, setState] = useState<Library>({ status: "loading" });
  const [filter, setFilter] = useState<SongFilterValue>("todas");

  useEffect(() => {
    const controller = new AbortController();
    void loadLibrary(nickname, controller.signal, setState, router);
    return () => controller.abort();
  }, [nickname, router]);

  useEffect(() => {
    if (state.status !== "ready") return;
    const label = state.person.name ?? state.person.nickname;
    document.title = `${label} — maresias`;
    return () => {
      document.title = "maresias";
    };
  }, [state]);

  if (state.status !== "ready") {
    const message =
      state.status === "missing"
        ? "Não achamos esse apelido."
        : state.status === "error"
          ? "Não conseguimos abrir essa página agora. Tente de novo daqui a pouco."
          : "Abrindo…";
    return (
      <div className="flex flex-col gap-8">
        <BackLink href="/amigos" />
        <p className="text-2xl leading-snug">{message}</p>
      </div>
    );
  }

  const person = state.person;
  const name = person.name ?? person.nickname;
  const all = everySong(person);
  const songs = filter === "cifradas" ? all.filter((song) => song.ciphered) : all;
  const empty = filter === "cifradas" ? "Nenhuma cifra ainda." : "Nenhuma música ainda.";
  const hrefFor = (songId: number) => (person.self ? `/musica/${songId}` : `/musica/${songId}?de=${person.nickname}`);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <BackLink href="/amigos" />
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-bold leading-tight">{name}</h1>
          <p className="text-xl font-bold leading-snug text-[#1b4f8a]">{person.nickname}</p>
        </div>
      </div>

      <p className="text-xl leading-snug">
        {countPhrase(person.favorites.length, "favorita", "favoritas")} ·{" "}
        {countPhrase(person.ciphers.length, "cifrada", "cifradas")}
      </p>

      <SongFilter value={filter} onChange={setFilter} />

      {songs.length === 0 ? (
        <p className="text-2xl leading-snug">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-3" aria-label={filter === "cifradas" ? "Cifradas" : "Todas"}>
          {songs.map((song) => (
            <li key={song.id}>
              <Link href={hrefFor(song.id)} className={songLinkClass}>
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

function everySong(person: Person): Song[] {
  const byId = new Map<number, Song>();
  for (const song of person.favorites) byId.set(song.id, song);
  for (const song of person.ciphers) {
    const current = byId.get(song.id);
    byId.set(song.id, current ? { ...current, ciphered: true } : { ...song, ciphered: true });
  }
  return [...byId.values()].sort(compareFavorites);
}

async function loadLibrary(
  nickname: string,
  signal: AbortSignal,
  setState: (state: Library) => void,
  router: { replace: (href: string) => void },
) {
  try {
    const response = await fetch(`/api/pessoa?q=${encodeURIComponent(nickname)}&musicas=1`, {
      cache: "no-store",
      signal,
    });
    const body = (await response.json()) as {
      ok?: boolean;
      ready?: boolean;
      signedIn?: boolean;
      found?: boolean;
      self?: boolean;
      nickname?: string;
      name?: string | null;
      favorites?: Song[];
      ciphers?: Song[];
    };
    if (!response.ok || !body.ok) {
      setState({ status: "error" });
      return;
    }
    if (!body.ready) {
      router.replace("/");
      return;
    }
    if (!body.signedIn) {
      router.replace("/entrar");
      return;
    }
    if (!body.found || !body.nickname) {
      setState({ status: "missing" });
      return;
    }
    setState({
      status: "ready",
      person: {
        self: Boolean(body.self),
        nickname: body.nickname,
        name: body.name ?? null,
        favorites: body.favorites ?? [],
        ciphers: body.ciphers ?? [],
      },
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    setState({ status: "error" });
  }
}
