"use client";

import { CipherBar, CipherLyrics, type CipherLyricsHandle } from "@/components/cipher-lyrics";
import { BackLink, bigButtonClass, compactButtonClass } from "@/components/controls";
import { FavoriteButton } from "@/components/favorite-button";
import { DEFAULT_LYRIC_SIZE, LYRIC_SIZES, usePrefs } from "@/components/preferences";
import { Button } from "@/components/ui/button";
import { useCipher } from "@/components/use-cipher";
import { rememberRecent } from "@/components/recent-songs";
import { lyricStanzas } from "@/lib/clean-lyrics";
import { presentArtist } from "@/lib/text";
import { transposeMarks, wrapSemitone } from "@/lib/transpose";
import { cn } from "@/lib/utils";
import { Ellipsis, FastForward, Pause, Play, Rewind } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";

const SPEEDS = [14, 24, 36, 52, 72];

const TONE_AMOUNTS = ["", "Um meio tom", "Dois meios-tons", "Três meios-tons", "Quatro meios-tons", "Cinco meios-tons", "Seis meios-tons"];

function tonePhrase(steps: number) {
  if (steps === 0) return "Tom original.";
  const amount = TONE_AMOUNTS[Math.abs(steps)] ?? `${Math.abs(steps)} meios-tons`;
  return steps > 0 ? `${amount} acima.` : `${amount} abaixo.`;
}

function toneLabel(steps: number) {
  if (steps > 0) return `+${steps}`;
  if (steps < 0) return `−${Math.abs(steps)}`;
  return "0";
}

function CipherOptions({
  open,
  onOpenChange,
  canEdit,
  canShift,
  semitones,
  onEdit,
  onTone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit: boolean;
  canShift: boolean;
  semitones: number;
  onEdit: () => void;
  onTone: (direction: -1 | 1) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      const raw = event.target;
      const target = raw instanceof Element ? raw : raw instanceof Node ? raw.parentElement : null;
      if (!target || rootRef.current?.contains(target)) return;
      if (target.closest("[data-lyrics]")) {
        const stopClick = (click: Event) => {
          click.stopPropagation();
          click.preventDefault();
        };
        document.addEventListener("click", stopClick, true);
        window.setTimeout(() => document.removeEventListener("click", stopClick, true), 0);
      }
      onOpenChange(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      onOpenChange(false);
      rootRef.current?.querySelector<HTMLButtonElement>('[aria-label="Opções da cifra"]')?.focus();
    }
    document.addEventListener("pointerdown", dismiss, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", dismiss, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn(
          compactButtonClass,
          open && "bg-foreground text-background hover:bg-foreground hover:text-background",
        )}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label="Opções da cifra"
        onClick={() => onOpenChange(!open)}
      >
        <Ellipsis className="size-6" aria-hidden="true" />
      </Button>
      {open ? (
        <div
          id={panelId}
          className="absolute top-full right-0 z-40 mt-2 flex w-max flex-col gap-2 rounded-2xl border-[3px] border-foreground bg-background p-2"
        >
          {canEdit ? (
            <Button
              type="button"
              variant="outline"
              className={cn(compactButtonClass, "w-full px-3")}
              onClick={onEdit}
            >
              Editar cifra
            </Button>
          ) : null}
          {canShift ? (
            <div role="group" aria-label="Tom da cifra" className="flex items-center justify-center gap-2">
              <span className="px-1 text-sm font-bold">Tom</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={compactButtonClass}
                aria-label="Descer meio tom"
                onClick={() => onTone(-1)}
              >
                −
              </Button>
              <span className="w-8 text-center text-sm font-bold tabular-nums" aria-hidden="true">
                {toneLabel(semitones)}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={compactButtonClass}
                aria-label="Subir meio tom"
                onClick={() => onTone(1)}
              >
                +
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

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
  const [semitones, setSemitones] = useState(0);
  const [toneNote, setToneNote] = useState("");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [chromeHeight, setChromeHeight] = useState(0);
  const scrollerRef = useRef<HTMLElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const lyricsRef = useRef<CipherLyricsHandle>(null);
  const dragRef = useRef({ x: 0, y: 0, moved: false });
  const saveRequest = useRef(0);
  const headerHiddenRef = useRef(false);
  const editingRef = useRef(false);
  const chromeLockRef = useRef(false);

  if (requestId !== id) {
    setRequestId(id);
    setAttempt(0);
    setLoad({ status: "loading" });
    setArmed(false);
    setPlaying(false);
    setScrollNote("");
    setSizeNote("");
    setSave(null);
    setSemitones(0);
    setToneNote("");
    setOptionsOpen(false);
    headerHiddenRef.current = false;
    setHeaderHidden(false);
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
    const request = ++saveRequest.current;
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
        if (cancelled || request !== saveRequest.current || !response.ok || !body.ok || !body.signedIn) {
          if (!cancelled && request === saveRequest.current) setSave(null);
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
  }, [id, from, invalidId]);

  const visibleLoad: LoadState = invalidId ? { status: "missing" } : load;
  const lyric = visibleLoad.status === "ready" ? visibleLoad.lyric : null;
  const cipher = useCipher(id, lyric, from);
  const shownMarks = useMemo(
    () => (cipher.editing ? cipher.viewMarks : transposeMarks(cipher.viewMarks, semitones)),
    [cipher.editing, cipher.viewMarks, semitones],
  );
  const canEdit = Boolean(lyric) && cipher.visible && !cipher.shared && cipher.exists && cipher.enabled && !cipher.editing;
  const canShift = Boolean(lyric) && !cipher.editing && cipher.viewMarks.length > 0;
  const showOptions = canEdit || canShift;
  const title = lyric?.title ?? "Música";
  const artist = lyric ? presentArtist(lyric.artist) : "";
  editingRef.current = cipher.editing;
  chromeLockRef.current = optionsOpen;

  useEffect(() => {
    if (!optionsOpen) return;
    headerHiddenRef.current = false;
    setHeaderHidden(false);
  }, [optionsOpen]);

  useEffect(() => {
    headerHiddenRef.current = cipher.editing;
    setHeaderHidden(cipher.editing);
  }, [cipher.editing]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let last = el.scrollTop;
    let acc = 0;

    const apply = (hidden: boolean) => {
      if (headerHiddenRef.current === hidden) return;
      headerHiddenRef.current = hidden;
      setHeaderHidden(hidden);
    };

    const onScroll = () => {
      if (editingRef.current) {
        last = el.scrollTop;
        acc = 0;
        return;
      }
      const y = el.scrollTop;
      const delta = y - last;
      last = y;
      if (chromeLockRef.current || y <= 4) {
        acc = 0;
        apply(false);
        return;
      }
      if (delta === 0) return;
      if ((delta > 0 && acc < 0) || (delta < 0 && acc > 0)) acc = 0;
      acc += delta;
      if (acc > 40) {
        acc = 0;
        apply(true);
      } else if (acc < -8) {
        acc = 0;
        apply(false);
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [id]);

  useLayoutEffect(() => {
    const el = chromeRef.current;
    if (!el) return;
    const update = () => setChromeHeight(el.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
    const cover = chromeLockRef.current ? (chromeRef.current?.offsetHeight ?? 0) : 0;
    const delta = word.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 16 - cover;
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

  useEffect(() => {
    if (!showOptions) setOptionsOpen(false);
  }, [showOptions]);

  function changeTone(direction: -1 | 1) {
    const next = wrapSemitone(semitones + direction);
    setSemitones(next);
    setToneNote(tonePhrase(next));
  }

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

  const borrowed =
    cipher.shared && cipher.exists
      ? cipher.creditNickname
        ? { name: cipher.creditName, nickname: cipher.creditNickname }
        : { name: cipher.ownerName, nickname: cipher.owner }
      : cipher.creditNickname && cipher.enabled
        ? { name: cipher.creditName, nickname: cipher.creditNickname }
        : null;

  const scrollStatus = !armed
    ? scrollNote
    : playing
      ? "A letra está rolando. Toque nela para pausar."
      : "Rolagem pausada. Toque na letra para continuar.";

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div
        ref={chromeRef}
        className={cn(
          "absolute inset-x-0 top-0 z-20 transition-transform duration-300 ease-out motion-reduce:transition-none",
          headerHidden && "pointer-events-none",
        )}
        style={{ transform: headerHidden ? "translateY(-100%)" : "translateY(0)" }}
        inert={headerHidden}
      >
      <header className="bg-background">
        <div className="border-b border-foreground/30 px-3 py-2 sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl items-start gap-3">
          <BackLink href={from ? `/amigos/${from}` : "/"} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <h1 className="line-clamp-2 text-xl font-bold leading-tight">{title}</h1>
                {artist ? <p className="truncate text-sm leading-snug">{artist}</p> : null}
              </div>
              {cipher.visible && lyric && (!cipher.shared || showOptions) ? (
                <div className="flex shrink-0 items-center gap-2">
                  {!cipher.shared && !cipher.editing ? (
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
                        setOptionsOpen(false);
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
                  ) : null}
                  {showOptions ? (
                    <CipherOptions
                      open={optionsOpen}
                      onOpenChange={setOptionsOpen}
                      canEdit={canEdit}
                      canShift={canShift}
                      semitones={semitones}
                      onEdit={() => {
                        setOptionsOpen(false);
                        setPlaying(false);
                        cipher.startEdit();
                      }}
                      onTone={changeTone}
                    />
                  ) : null}
                </div>
              ) : null}
              {from && !cipher.self && lyric && cipher.visible ? (
                <Button
                  type="button"
                  variant="outline"
                  className={cn(compactButtonClass, "w-auto shrink-0 px-3")}
                  disabled={cipher.pending}
                  aria-label={
                    cipher.confirmCopy
                      ? "Confirmar a cópia da cifra"
                      : cipher.exists && cipher.mine
                        ? "Substituir a sua cifra"
                        : "Copiar esta música"
                  }
                  onClick={() => {
                    setPlaying(false);
                    void cipher.copyCipher().then((kept) => {
                      if (!kept) return;
                      saveRequest.current += 1;
                      setSave({ signedIn: true, saved: true });
                    });
                  }}
                >
                  {cipher.confirmCopy ? "Confirmar" : cipher.exists && cipher.mine ? "Substituir" : "Copiar"}
                </Button>
              ) : null}
              {(!from || cipher.self) && !invalidId && save ? (
                <FavoriteButton
                  key={`${id}:${save.signedIn}:${save.saved}`}
                  songId={Number(id)}
                  title={lyric?.title ?? ""}
                  artist={lyric?.artist ?? ""}
                  initialSaved={save.saved}
                  signedIn={save.signedIn}
                  ready={Boolean(lyric)}
                  onReleased={cipher.releaseCipher}
                />
              ) : null}
            </div>
          </div>
        </div>
        </div>
      {borrowed?.nickname ? (
        <p className="bg-secondary px-3 py-1.5 text-center text-sm leading-snug">
          Cifrado por {borrowed.name ? `${borrowed.name} · ` : ""}
          <span className="font-bold text-[#1b4f8a]">{borrowed.nickname}</span>
        </p>
      ) : null}
      </header>
      </div>

      <main
        ref={scrollerRef}
        aria-label="Letra"
        data-lyrics
        className={cn(
          "min-h-0 flex-1 overflow-y-auto px-5 sm:px-10",
          cipher.editing ? "pt-[max(1rem,env(safe-area-inset-top))] pb-4" : "py-4",
        )}
        style={cipher.editing ? undefined : { paddingTop: chromeHeight + 16 }}
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
              ref={lyricsRef}
              stanzas={cipher.stanzas}
              marks={shownMarks}
              editing={cipher.editing}
              selected={cipher.selected}
              selectedId={cipher.selectedId}
              spot={cipher.spot}
              drifted={cipher.drifted}
              onSelect={cipher.selectWord}
              onSelectMark={cipher.selectMark}
              onMove={cipher.moveMark}
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
      </main>

      <footer className="shrink-0 border-t border-foreground/30 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-2">
          <div aria-live="polite" className="sr-only">
            {sizeNote ? <p>{sizeNote}</p> : null}
            {scrollStatus ? <p>{scrollStatus}</p> : null}
            {toneNote ? <p>{toneNote}</p> : null}
          </div>
          {cipher.editing ? (
            <>
              <CipherBar
                word={cipher.selectedWord?.text ?? null}
                gap={cipher.spot?.gap ?? cipher.selectedMark?.gap ?? 0}
                value={cipher.chordInput}
                error={cipher.chordError}
                note={cipher.note}
                pending={cipher.pending}
                canClear={Boolean(cipher.selectedMark)}
                canAdd={
                  Boolean(cipher.selectedWord) &&
                  cipher.viewMarks.some(
                    (mark) => mark.stanza === cipher.selectedWord?.stanza && mark.line === cipher.selectedWord?.line,
                  )
                }
                focusTick={cipher.focusTick}
                onChange={cipher.setChordInput}
                onSave={(chord) =>
                  cipher.saveChord(chord, (name, place, selfId) => {
                    const fitted = lyricsRef.current?.fitPlace(name, place, selfId);
                    if (fitted) return fitted;
                    return selfId ? place : null;
                  })
                }
                onClear={cipher.clearChord}
                onAdd={() => {
                  if (!cipher.anchor) return;
                  cipher.beginAt(lyricsRef.current?.nextPlace(cipher.anchor) ?? null);
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full touch-manipulation rounded-xl border-2 border-foreground bg-foreground text-lg font-bold text-background shadow-none hover:bg-foreground hover:text-background focus-visible:ring-4"
                disabled={cipher.pending}
                onClick={() => {
                  void cipher.finishEdit().then((kept) => {
                    if (!kept) return;
                    saveRequest.current += 1;
                    setSave({ signedIn: true, saved: true });
                  });
                }}
              >
                Pronto
              </Button>
            </>
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
