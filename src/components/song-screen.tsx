"use client";

import { CipherBar, CipherLyrics } from "@/components/cipher-lyrics";
import { BackLink, bigButtonClass, compactButtonClass } from "@/components/controls";
import { FavoriteButton } from "@/components/favorite-button";
import { DEFAULT_LYRIC_SIZE, LYRIC_SIZES, usePrefs } from "@/components/preferences";
import { Button } from "@/components/ui/button";
import { useCipher } from "@/components/use-cipher";
import { rememberRecent } from "@/components/recent-songs";
import { lyricStanzas } from "@/lib/clean-lyrics";
import { presentArtist } from "@/lib/text";
import { cn } from "@/lib/utils";
import { FastForward, Pause, Pencil, Play, Rewind } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const SPEEDS = [14, 24, 36, 52, 72];

type Lyric = {
  id: number | null;
  artist: string;
  title: string;
  lyrics: string;
};

type LoadState =
  | { status: "loading" }
  | { status: "ready"; lyric: Lyric }
  | { status: "missing" }
  | { status: "error" };

type SaveState = { signedIn: boolean; saved: boolean } | null;

export function SongScreen({ id, from = null }: { id: string; from?: string | null }) {
  const { size, setSize } = usePrefs();
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [armed, setArmed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);
  const [sizeNote, setSizeNote] = useState("");
  const [scrollNote, setScrollNote] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [requestId, setRequestId] = useState(id);
  const [save, setSave] = useState<SaveState>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ x: 0, y: 0, moved: false });

  if (requestId !== id) {
    setRequestId(id);
    setAttempt(0);
    setLoad({ status: "loading" });
    setArmed(false);
    setPlaying(false);
    setScrollNote("");
    setSizeNote("");
    setSave(null);
  }

  const invalidId = !/^\d+$/.test(id);

  useEffect(() => {
    if (invalidId) return;
    const controller = new AbortController();
    let cancelled = false;
    scrollerRef.current?.scrollTo({ top: 0 });

    fetch(`/api/letra?id=${id}`, { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as { ok?: boolean; error?: string } & Partial<Lyric>;
        if (cancelled) return;
        if (response.status === 404 || body.error === "missing") {
          setLoad({ status: "missing" });
          return;
        }
        if (!response.ok || !body.ok || !body.lyrics || !body.title) {
          setLoad({ status: "error" });
          return;
        }
        setLoad({
          status: "ready",
          lyric: {
            id: body.id ?? null,
            artist: body.artist ?? "",
            title: body.title,
            lyrics: body.lyrics,
          },
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoad({ status: "error" });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [id, attempt, invalidId]);

  useEffect(() => {
    if (invalidId) return;
    const controller = new AbortController();
    let cancelled = false;
    const timer = window.setTimeout(() => controller.abort(), 8000);
    fetch(`/api/favorito?id=${id}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as {
          ok?: boolean;
          showSave?: boolean;
          signedIn?: boolean;
          saved?: boolean;
        };
        if (cancelled || !response.ok || !body.ok || !body.signedIn) {
          setSave(null);
          return;
        }
        setSave({ signedIn: true, saved: Boolean(body.saved) });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
      });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [id, invalidId]);

  const visibleLoad: LoadState = invalidId ? { status: "missing" } : load;
  const lyric = visibleLoad.status === "ready" ? visibleLoad.lyric : null;
  const cipher = useCipher(id, lyric, from);
  const title = lyric?.title ?? "Música";
  const artist = lyric ? presentArtist(lyric.artist) : "";

  useEffect(() => {
    if (!title || title === "Música") return;
    document.title = `${title} — maresias`;
    return () => {
      document.title = "maresias";
    };
  }, [title]);

  useEffect(() => {
    if (!lyric || !/^\d+$/.test(id)) return;
    rememberRecent({ id: Number(id), title: lyric.title, artist: lyric.artist });
  }, [id, lyric]);

  useEffect(() => {
    if (!cipher.editing || !cipher.selected || cipher.focusTick === 0) return;
    const scroller = scrollerRef.current;
    const word = scroller?.querySelector<HTMLElement>(`[data-cipher-word="${cipher.selected}"]`);
    if (!scroller || !word) return;
    const delta = word.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 16;
    scroller.scrollTo({ top: scroller.scrollTop + delta });
  }, [cipher.editing, cipher.selected, cipher.focusTick]);

  useEffect(() => {
    if (!playing) return;
    if (!scrollerRef.current) return;
    let frame = 0;
    let last = performance.now();
    let carry = 0;
    const speed = SPEEDS[speedIndex] ?? SPEEDS[1];
    const step = (now: number) => {
      const el = scrollerRef.current;
      if (!el) return;
      const dt = Math.min(50, now - last);
      last = now;
      carry += (speed * dt) / 1000;
      const whole = Math.floor(carry);
      if (whole > 0) {
        el.scrollTop += whole;
        carry -= whole;
      }
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) {
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing, speedIndex]);

  function changeSize(direction: -1 | 1) {
    const index = LYRIC_SIZES.indexOf(size as (typeof LYRIC_SIZES)[number]);
    const fallback = LYRIC_SIZES.indexOf(DEFAULT_LYRIC_SIZE);
    const current = index === -1 ? fallback : index;
    const next = LYRIC_SIZES[current + direction];
    if (!next) {
      setSizeNote(
        direction > 0 ? "A letra já está no maior tamanho." : "A letra já está no menor tamanho.",
      );
      return;
    }
    setSizeNote("");
    setSize(next);
  }

  function startScroll() {
    const scroller = scrollerRef.current;
    if (scroller && scroller.scrollHeight <= scroller.clientHeight + 8) {
      setScrollNote("Esta letra já está toda na tela.");
      setArmed(false);
      setPlaying(false);
      return;
    }
    setScrollNote("");
    setArmed(true);
    setPlaying(true);
  }

  function toggleScroll() {
    const scroller = scrollerRef.current;
    if (!playing && scroller && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 8) {
      scroller.scrollTop = 0;
    }
    setPlaying((value) => !value);
  }

  const scrollStatus = !armed
    ? scrollNote
    : playing
      ? "A letra está rolando. Toque nela para pausar."
      : "Rolagem pausada. Toque na letra para continuar.";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-foreground/30 px-3 py-2 sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          <BackLink href={from ? `/amigos?apelido=${from}` : "/"} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold leading-tight">{title}</h1>
            {artist ? <p className="truncate text-sm leading-snug">{artist}</p> : null}
            {cipher.shared && cipher.exists ? (
              <p className="truncate text-sm leading-snug">
                Cifra de {cipher.ownerName ? `${cipher.ownerName} · ` : ""}
                {cipher.owner}
              </p>
            ) : null}
            {from ? (
              <Link
                href={`/musica/${id}`}
                className="text-sm leading-snug text-foreground underline underline-offset-4 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-foreground"
              >
                Sua versão
              </Link>
            ) : null}
          </div>
          {cipher.visible && lyric && !cipher.shared ? (
            <div className="flex shrink-0 items-center gap-2">
              {cipher.editing ? (
                <Button
                  type="button"
                  variant="outline"
                  className={cn(compactButtonClass, "w-auto px-3")}
                  disabled={cipher.pending}
                  onClick={() => void cipher.finishEdit()}
                >
                  Pronto
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  aria-pressed={cipher.exists ? cipher.enabled : undefined}
                  className={cn(
                    compactButtonClass,
                    "w-auto px-3",
                    cipher.exists && cipher.enabled && "bg-foreground text-background hover:bg-foreground hover:text-background",
                  )}
                  disabled={cipher.pending}
                  onClick={() => {
                    if (!cipher.exists) {
                      setPlaying(false);
                      cipher.startEdit();
                      return;
                    }
                    void cipher.toggle();
                  }}
                >
                  {cipher.exists ? "Cifra" : "Cifrar"}
                </Button>
              )}
              {cipher.exists && cipher.enabled && !cipher.editing ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={compactButtonClass}
                  aria-label="Editar cifra"
                  disabled={cipher.pending}
                  onClick={() => {
                    setPlaying(false);
                    cipher.startEdit();
                  }}
                >
                  <Pencil className="size-6" aria-hidden="true" />
                </Button>
              ) : null}
            </div>
          ) : null}
          {!invalidId && save ? (
            <FavoriteButton
              key={`${id}:${save.signedIn}:${save.saved}`}
              songId={Number(id)}
              title={lyric?.title ?? ""}
              artist={lyric?.artist ?? ""}
              initialSaved={save.saved}
              signedIn={save.signedIn}
              ready={Boolean(lyric)}
            />
          ) : null}
        </div>
      </header>

      <div
        ref={scrollerRef}
        data-lyrics
        className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-10"
        onPointerDown={(event) => {
          dragRef.current = { x: event.clientX, y: event.clientY, moved: false };
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (Math.abs(event.clientX - drag.x) > 12 || Math.abs(event.clientY - drag.y) > 12) {
            drag.moved = true;
            if (playing) setPlaying(false);
          }
        }}
        onClick={() => {
          if (cipher.editing || !armed || dragRef.current.moved) return;
          toggleScroll();
        }}
      >
        <div className="mx-auto w-full max-w-3xl">
          {visibleLoad.status === "loading" ? (
            <p className="text-3xl leading-snug">Buscando a letra…</p>
          ) : null}
          {visibleLoad.status === "missing" ? (
            <p className="text-3xl leading-snug">Não achamos a letra desta música.</p>
          ) : null}
          {visibleLoad.status === "error" ? (
            <div className="flex flex-col gap-6">
              <p className="text-3xl leading-snug">
                Não conseguimos abrir a letra agora. A internet pode ter falhado.
              </p>
              <Button
                type="button"
                size="grande"
                className={bigButtonClass}
                onClick={() => {
                  setLoad({ status: "loading" });
                  setAttempt((value) => value + 1);
                }}
              >
                Tentar de novo
              </Button>
            </div>
          ) : null}
          {lyric && (cipher.editing || cipher.viewMarks.length > 0) ? (
            <CipherLyrics
              stanzas={cipher.stanzas}
              marks={cipher.viewMarks}
              editing={cipher.editing}
              selected={cipher.selected}
              drifted={cipher.drifted}
              onSelect={cipher.selectWord}
              onGap={cipher.setGap}
            />
          ) : lyric ? (
            <div className="letra flex flex-col" style={{ fontSize: "var(--lyric-size)", lineHeight: 1.6, gap: "0.85em" }}>
              {cipher.drifted ? <p className="text-sm leading-snug">A letra mudou. Confira os acordes.</p> : null}
              {lyricStanzas(lyric.lyrics).map((stanza, index) => (
                <p key={index} className="whitespace-pre-wrap">
                  {stanza}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <footer className="shrink-0 border-t border-foreground/30 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-2">
          <div aria-live="polite" className="sr-only">
            {sizeNote ? <p>{sizeNote}</p> : null}
            {scrollStatus ? <p>{scrollStatus}</p> : null}
          </div>
          {cipher.editing ? (
            <CipherBar
              word={cipher.selectedWord?.text ?? null}
              gap={cipher.selectedMark?.gap ?? 0}
              value={cipher.chordInput}
              error={cipher.chordError}
              note={cipher.note}
              pending={cipher.pending}
              canClear={Boolean(cipher.selectedMark)}
              focusTick={cipher.focusTick}
              onChange={cipher.setChordInput}
              onSave={cipher.saveChord}
              onClear={cipher.clearChord}
            />
          ) : (
            <>
          {cipher.note ? (
            <p className="text-center text-sm leading-snug" aria-live="polite">
              {cipher.note}
            </p>
          ) : null}
          {sizeNote || (!armed && scrollNote) ? (
            <p className="text-center text-sm leading-snug" aria-hidden="true">
              {sizeNote || scrollNote}
            </p>
          ) : null}

          <div className="flex items-center justify-center gap-6">
            <div role="group" aria-label="Tamanho da letra" className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={compactButtonClass}
                aria-label="Diminuir a letra"
                onClick={() => changeSize(-1)}
              >
                A−
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={compactButtonClass}
                aria-label="Aumentar a letra"
                onClick={() => changeSize(1)}
              >
                A+
              </Button>
            </div>

            <div role="group" aria-label="Rolagem da letra" className="flex gap-2">
              {armed ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={compactButtonClass}
                  aria-label={playing ? "Pausar" : "Continuar"}
                  onClick={toggleScroll}
                >
                  {playing ? <Pause className="size-6" aria-hidden="true" /> : <Play className="size-6" aria-hidden="true" />}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={compactButtonClass}
                  aria-label="Rolar devagar"
                  onClick={startScroll}
                >
                  <Play className="size-6" aria-hidden="true" />
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={compactButtonClass}
                aria-label="Mais devagar"
                onClick={() => {
                  setArmed(true);
                  setSpeedIndex((value) => Math.max(0, value - 1));
                }}
                disabled={!armed}
              >
                <Rewind className="size-6" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={compactButtonClass}
                aria-label="Mais rápido"
                onClick={() => {
                  setArmed(true);
                  setSpeedIndex((value) => Math.min(SPEEDS.length - 1, value + 1));
                }}
                disabled={!armed}
              >
                <FastForward className="size-6" aria-hidden="true" />
              </Button>
            </div>
          </div>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}
