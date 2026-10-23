"use client";

import { CipherBadge } from "@/components/cipher-badge";
import { bigButtonClass } from "@/components/controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { presentArtist } from "@/lib/text";
import Link from "next/link";
import { isNickname } from "@/lib/nickname";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

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

type Lookup =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "invalid" }
  | { status: "missing" }
  | { status: "error" }
  | { status: "ready"; person: Person };

const songLinkClass =
  "flex min-h-20 items-center gap-4 rounded-2xl border-[3px] border-foreground bg-card px-5 py-4 text-foreground no-underline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-foreground active:translate-y-px";

export function FriendLookup({ mine, initial }: { mine: string | null; initial: string | null }) {
  const router = useRouter();
  const requestRef = useRef(0);
  const [query, setQuery] = useState(initial ?? "");
  const [copied, setCopied] = useState(false);
  const [state, setState] = useState<Lookup>(initial ? { status: "loading" } : { status: "idle" });

  useEffect(() => {
    if (!initial) return;
    const request = ++requestRef.current;
    const controller = new AbortController();
    void loadPerson(initial, controller.signal, (next) => {
      if (request === requestRef.current) setState(next);
    }, router);
    return () => controller.abort();
  }, [initial, router]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const nickname = query.trim().toLowerCase();
    const request = ++requestRef.current;
    if (!nickname) {
      setState({ status: "idle" });
      return;
    }
    if (!isNickname(nickname)) {
      setState({ status: "invalid" });
      return;
    }
    setState({ status: "loading" });
    void loadPerson(nickname, undefined, (next) => {
      if (request === requestRef.current) setState(next);
    }, router);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="text-2xl leading-snug">
          Cada pessoa ganha um apelido, como mar0001. Quem souber dele pode ver as favoritas e as cifras.
        </p>
        {mine ? (
          <button
            type="button"
            className="w-fit text-left text-3xl font-bold underline-offset-4 hover:underline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-foreground"
            aria-label={copied ? "Apelido copiado" : `Copiar o seu apelido ${mine}`}
            onClick={() => {
              void navigator.clipboard.writeText(mine).then(
                () => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                },
                () => undefined,
              );
            }}
          >
            {copied ? "Apelido copiado" : `O seu é ${mine}`}
          </button>
        ) : (
          <p className="text-2xl leading-snug">Não conseguimos criar o seu apelido agora.</p>
        )}
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4" role="search">
        <label htmlFor="apelido" className="text-2xl leading-snug">
          Apelido
        </label>
        <Input
          id="apelido"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="mar0001"
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          enterKeyHint="search"
          spellCheck={false}
          className="h-20 rounded-2xl border-[3px] bg-card px-5 text-3xl placeholder:text-3xl placeholder:text-foreground/70 md:text-3xl"
        />
        <Button type="submit" size="grande" className={bigButtonClass} disabled={state.status === "loading"}>
          {state.status === "loading" ? "Procurando…" : "Ver"}
        </Button>
      </form>

      <div aria-live="polite">
        {state.status === "loading" ? <p className="text-2xl leading-snug">Procurando…</p> : null}
        {state.status === "invalid" ? (
          <p className="text-2xl leading-snug">O apelido é o começo do nome e um número, como mar0001.</p>
        ) : null}
        {state.status === "missing" ? <p className="text-2xl leading-snug">Não achamos esse apelido.</p> : null}
        {state.status === "error" ? (
          <p className="text-2xl leading-snug">Não conseguimos procurar agora. Tente de novo daqui a pouco.</p>
        ) : null}
        {state.status === "ready" ? <PersonLibrary person={state.person} /> : null}
      </div>
    </div>
  );
}

function PersonLibrary({ person }: { person: Person }) {
  const hrefFor = (songId: number) =>
    person.self ? `/musica/${songId}` : `/musica/${songId}?de=${person.nickname}`;

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-3xl font-bold leading-tight">{person.name ?? person.nickname}</h2>
      <SongList title="Favoritas" empty="Nenhuma favorita ainda." songs={person.favorites} hrefFor={hrefFor} />
      <SongList title="Cifras" empty="Nenhuma cifra ainda." songs={person.ciphers} hrefFor={hrefFor} />
    </div>
  );
}

function SongList({
  title,
  empty,
  songs,
  hrefFor,
}: {
  title: string;
  empty: string;
  songs: Song[];
  hrefFor: (songId: number) => string;
}) {
  const headingId = title.toLowerCase();
  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className="text-3xl font-bold">
        {title}
      </h3>
      {songs.length === 0 ? (
        <p className="mt-4 text-2xl leading-snug">{empty}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
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
    </section>
  );
}

async function loadPerson(
  nickname: string,
  signal: AbortSignal | undefined,
  setState: (state: Lookup) => void,
  router: { replace: (href: string) => void },
) {
  try {
    const response = await fetch(`/api/pessoa?q=${encodeURIComponent(nickname)}`, { cache: "no-store", signal });
    const body = (await response.json()) as {
      ok?: boolean;
      ready?: boolean;
      signedIn?: boolean;
      found?: boolean;
      invalid?: boolean;
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
    if (body.invalid) {
      setState({ status: "invalid" });
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
