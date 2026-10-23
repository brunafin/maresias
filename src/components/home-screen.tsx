"use client";

import { bigButtonClass } from "@/components/controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";

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
  const requestRef = useRef(0);

  function onQueryChange(value: string) {
    setQuery(value);
    if (value.trim() === "") {
      requestRef.current += 1;
      setState({ status: "idle" });
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (q.length < 2) {
      requestRef.current += 1;
      setState({ status: "empty", query: q });
      return;
    }
    const request = ++requestRef.current;
    setState({ status: "loading" });
    try {
      const response = await fetch(`/api/busca?q=${encodeURIComponent(q)}`);
      const body = (await response.json()) as {
        ok?: boolean;
        results?: Hit[];
      };
      if (request !== requestRef.current) return;
      if (!response.ok || !body.ok) {
        setState({ status: "error" });
        return;
      }
      const results = body.results ?? [];
      setState(results.length ? { status: "results", results, query: q } : { status: "empty", query: q });
    } catch {
      if (request !== requestRef.current) return;
      setState({ status: "error" });
    }
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
            maresias
          </h1>
          <p className="mt-4 text-2xl leading-snug">
            Escreva o nome da música ou do cantor e toque em Buscar.
          </p>
        </header>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" role="search">
          <label htmlFor="busca" className="text-2xl font-bold">
            Buscar uma música
          </label>
          <Input
            id="busca"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Nome da música ou do cantor"
            autoComplete="off"
            autoCorrect="off"
            enterKeyHint="search"
            className="h-20 rounded-2xl border-[3px] bg-card px-5 text-3xl placeholder:text-foreground/70 md:text-3xl"
          />
          <Button type="submit" size="grande" className={bigButtonClass} disabled={state.status === "loading"}>
            {state.status === "loading" ? "Procurando…" : "Buscar"}
          </Button>
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
