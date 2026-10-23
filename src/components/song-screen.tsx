"use client";

import { BackLink, ContrastControl, bigButtonClass } from "@/components/controls";
import { LYRIC_SIZES, usePrefs } from "@/components/preferences";
import { Button } from "@/components/ui/button";
import { presentArtist } from "@/lib/text";
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

export function SongScreen({ id }: { id: string }) {
  const { size, setSize } = usePrefs();
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [armed, setArmed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);
  const [sizeNote, setSizeNote] = useState("");
  const [scrollNote, setScrollNote] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [requestId, setRequestId] = useState(id);
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

  const visibleLoad: LoadState = invalidId ? { status: "missing" } : load;
  const lyric = visibleLoad.status === "ready" ? visibleLoad.lyric : null;
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
    const current = index === -1 ? 2 : index;
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
      <header className="shrink-0 border-b-[3px] border-foreground px-4 py-3 sm:px-8 sm:py-4">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
          <BackLink />
          <div>
            <h1 className="text-3xl font-bold leading-tight sm:text-5xl">{title}</h1>
            {artist ? <p className="mt-1 text-xl leading-snug sm:text-2xl">{artist}</p> : null}
          </div>
        </div>
      </header>

      <div
        ref={scrollerRef}
        data-lyrics
        className="min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-10"
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
          if (!armed || dragRef.current.moved) return;
          toggleScroll();
        }}
      >
        <div className="mx-auto w-full max-w-3xl">
          {visibleLoad.status === "loading" ? (
            <p className="text-3xl leading-snug">Buscando a letra…</p>
          ) : null}
          {visibleLoad.status === "missing" ? (
            <div className="flex flex-col gap-6">
              <p className="text-3xl leading-snug">Não achamos a letra desta música.</p>
              <BackLink />
            </div>
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
          {lyric ? (
            <p
              className="letra whitespace-pre-wrap"
              style={{ fontSize: "var(--lyric-size)", lineHeight: 1.6 }}
            >
              {lyric.lyrics}
            </p>
          ) : null}
        </div>
      </div>

      <footer className="shrink-0 border-t-[3px] border-foreground px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
          <div aria-live="polite" className="text-xl leading-snug">
            {sizeNote ? <p>{sizeNote}</p> : null}
            {scrollStatus ? <p>{scrollStatus}</p> : null}
          </div>

          <div role="group" aria-label="Tamanho da letra" className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              size="grande"
              variant="outline"
              className={bigButtonClass}
              aria-label="Diminuir a letra"
              onClick={() => changeSize(-1)}
            >
              A−
            </Button>
            <Button
              type="button"
              size="grande"
              variant="outline"
              className={bigButtonClass}
              aria-label="Aumentar a letra"
              onClick={() => changeSize(1)}
            >
              A+
            </Button>
          </div>

          <ContrastControl compact />

          <div role="group" aria-label="Rolagem da letra">
            {armed ? (
              <div className="grid grid-cols-3 gap-3">
                <Button type="button" size="grande" className={bigButtonClass} onClick={toggleScroll}>
                  {playing ? "Pausar" : "Continuar"}
                </Button>
                <Button
                  type="button"
                  size="grande"
                  variant="outline"
                  className={bigButtonClass}
                  onClick={() => setSpeedIndex((value) => Math.max(0, value - 1))}
                >
                  Mais devagar
                </Button>
                <Button
                  type="button"
                  size="grande"
                  variant="outline"
                  className={bigButtonClass}
                  onClick={() => setSpeedIndex((value) => Math.min(SPEEDS.length - 1, value + 1))}
                >
                  Mais rápido
                </Button>
              </div>
            ) : (
              <Button type="button" size="grande" className={bigButtonClass} onClick={startScroll}>
                Rolar devagar
              </Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
