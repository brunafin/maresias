"use client";

import { ContrastControl, bigButtonClass } from "@/components/controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { groups } from "@/lib/catalog";
import Link from "next/link";
import { useState, type FormEvent } from "react";

type Hit = {
  id: number;
  artist: string;
  title: string;
};

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "results"; results: Hit[]; query: string }
  | { status: "empty"; query: string }
  | { status: "error" };

const songLinkClass =
  "flex min-h-20 flex-col justify-center rounded-2xl border-[3px] border-foreground bg-card px-5 py-4 text-foreground no-underline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-foreground active:translate-y-px";

export function HomeScreen() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>({ status: "idle" });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (q.length < 2) {
      setState({ status: "empty", query: q });
      return;
    }
    setState({ status: "loading" });
    try {
      const response = await fetch(`/api/busca?q=${encodeURIComponent(q)}`);
      const body = (await response.json()) as {
        ok?: boolean;
        results?: Hit[];
      };
      if (!response.ok || !body.ok) {
        setState({ status: "error" });
        return;
      }
      const results = body.results ?? [];
      setState(results.length ? { status: "results", results, query: q } : { status: "empty", query: q });
    } catch {
      setState({ status: "error" });
    }
  }

  function clearSearch() {
    setQuery("");
    setState({ status: "idle" });
  }

  const resultCount =
    state.status === "results"
      ? state.results.length === 1
        ? "Encontramos 1 música."
        : `Encontramos ${state.results.length} músicas.`
      : "";

  return (
    <div className="h-full overflow-y-auto">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-6 sm:px-8 sm:py-10">
        <header>
          <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
            Letras da roda
          </h1>
          <p className="mt-4 text-2xl leading-snug">
            Letras grandes para cantar junto. Sem anúncio e sem cadastro.
          </p>
        </header>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" role="search">
          <label htmlFor="busca" className="text-2xl font-bold">
            Buscar uma música
          </label>
          <Input
            id="busca"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nome da música ou do cantor"
            autoComplete="off"
            autoCorrect="off"
            enterKeyHint="search"
            className="h-20 rounded-2xl border-[3px] bg-card px-5 text-3xl placeholder:text-foreground/70 md:text-3xl"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button type="submit" size="grande" className={bigButtonClass} disabled={state.status === "loading"}>
              {state.status === "loading" ? "Procurando…" : "Buscar"}
            </Button>
            {query || state.status !== "idle" ? (
              <Button
                type="button"
                size="grande"
                variant="outline"
                className={bigButtonClass}
                onClick={clearSearch}
              >
                Apagar
              </Button>
            ) : null}
          </div>
        </form>

        <div aria-live="polite" className="text-2xl leading-snug">
          {state.status === "loading" ? <p>Procurando a música…</p> : null}
          {state.status === "error" ? (
            <p>Não conseguimos buscar agora. Tente de novo daqui a pouco.</p>
          ) : null}
          {state.status === "empty" ? (
            <p>
              {state.query.length < 2
                ? "Escreva pelo menos duas letras."
                : "Nenhuma música com esse nome. Tente o cantor e o título."}
            </p>
          ) : null}
          {state.status === "results" ? <p>{resultCount}</p> : null}
        </div>

        {state.status === "results" ? (
          <section aria-labelledby="resultados">
            <h2 id="resultados" className="text-3xl font-bold">
              Resultados
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {state.results.map((song) => (
                <li key={song.id}>
                  <SongLink title={song.title} artist={song.artist} id={song.id} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="flex flex-col gap-10">
          <h2 className="text-3xl font-bold">Para cantar agora</h2>
          {groups.map((group) => (
            <section key={group.id} aria-labelledby={`grupo-${group.id}`}>
              <h3 id={`grupo-${group.id}`} className="text-3xl font-bold">
                {group.title}
              </h3>
              <ul className="mt-4 flex flex-col gap-3">
                {group.songs.map((song) => (
                  <li key={song.lrclibId}>
                    <SongLink title={song.title} artist={song.artist} id={song.lrclibId} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <ContrastControl />
      </main>
    </div>
  );
}

function SongLink({ id, title, artist }: { id: number; title: string; artist: string }) {
  return (
    <Link href={`/musica/${id}`} className={songLinkClass}>
      <span className="text-2xl font-bold leading-tight">{title}</span>
      <span className="mt-1 text-xl leading-snug">{artist}</span>
    </Link>
  );
}
