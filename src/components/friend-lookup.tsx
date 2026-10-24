"use client";

import { bigButtonClass } from "@/components/controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isNickname } from "@/lib/nickname";
import { countPhrase } from "@/lib/text";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

type Person = {
  nickname: string;
  name: string | null;
  favorites: number;
  ciphers: number;
};

type Lookup =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "invalid" }
  | { status: "missing" }
  | { status: "error" }
  | { status: "ready"; person: Person };

const cardClass =
  "flex min-h-20 flex-col justify-center gap-1 rounded-2xl border-[3px] border-foreground bg-card px-5 py-4 text-foreground no-underline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-foreground active:translate-y-px";

export function FriendLookup({ mine }: { mine: string | null }) {
  const router = useRouter();
  const requestRef = useRef(0);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [state, setState] = useState<Lookup>({ status: "idle" });

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
            {copied ? (
              "Apelido copiado"
            ) : (
              <>
                O seu é <span className="text-[#1b4f8a]">{mine}</span>
              </>
            )}
          </button>
        ) : (
          <p className="text-2xl leading-snug">Não conseguimos criar o seu apelido agora.</p>
        )}
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4" role="search">
        <label htmlFor="apelido" className="text-2xl leading-snug">
          Apelido do amigo
        </label>
        <Input
          id="apelido"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="mare0001"
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          enterKeyHint="search"
          spellCheck={false}
          className="h-20 rounded-2xl border-[3px] bg-card px-5 text-3xl placeholder:text-3xl placeholder:text-foreground/70 md:text-3xl"
        />
        <Button type="submit" size="grande" className={bigButtonClass} disabled={state.status === "loading"}>
          {state.status === "loading" ? "Procurando…" : "Pesquisar"}
        </Button>
      </form>

      <div aria-live="polite">
        {state.status === "loading" ? <p className="text-2xl leading-snug">Procurando…</p> : null}
        {state.status === "invalid" ? (
          <p className="text-2xl leading-snug">O apelido é o começo do nome e um número, como mare0001.</p>
        ) : null}
        {state.status === "missing" ? <p className="text-2xl leading-snug">Não achamos esse apelido.</p> : null}
        {state.status === "error" ? (
          <p className="text-2xl leading-snug">Não conseguimos procurar agora. Tente de novo daqui a pouco.</p>
        ) : null}
        {state.status === "ready" ? <PersonCard person={state.person} /> : null}
      </div>
    </div>
  );
}

function PersonCard({ person }: { person: Person }) {
  const name = person.name ?? person.nickname;
  return (
    <Link href={`/amigos/${person.nickname}`} className={cardClass} aria-label={`Abrir a página de ${name}`}>
      <span className="text-2xl font-bold leading-tight">{name}</span>
      <span className="text-xl font-bold leading-snug text-[#1b4f8a]">{person.nickname}</span>
      <span className="text-xl leading-snug">
        {countPhrase(person.favorites, "favorita", "favoritas")} · {countPhrase(person.ciphers, "cifrada", "cifradas")}
      </span>
    </Link>
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
      nickname?: string;
      name?: string | null;
      favorites?: number;
      ciphers?: number;
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
        nickname: body.nickname,
        name: body.name ?? null,
        favorites: typeof body.favorites === "number" ? body.favorites : 0,
        ciphers: typeof body.ciphers === "number" ? body.ciphers : 0,
      },
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    setState({ status: "error" });
  }
}
