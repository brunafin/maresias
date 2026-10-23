"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { lyricLines, placeLabel, wordKey, type CipherMark, type LyricWord } from "@/lib/cipher-marks";
import { cn } from "@/lib/utils";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from "react";

const chordClass =
  "absolute left-0 top-0 z-10 min-w-6 cursor-grab touch-none pr-3 pb-2 text-left text-[0.5em] font-bold leading-none whitespace-nowrap text-[#1b4f8a] select-none";

function sameLayout(left: Record<string, number[]>, right: Record<string, number[]>) {
  const keys = Object.keys(left);
  if (keys.length !== Object.keys(right).length) return false;
  for (const key of keys) {
    const a = left[key];
    const b = right[key];
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (Math.abs(a[i] - b[i]) > 0.5) return false;
    }
  }
  return true;
}

function measure(root: HTMLElement) {
  const next: Record<string, number[]> = {};
  for (const word of root.querySelectorAll<HTMLElement>("[data-cipher-word]")) {
    const key = word.dataset.cipherWord;
    const slot = word.querySelector<HTMLElement>("[data-slot]");
    const letters = [...word.querySelectorAll<HTMLElement>("[data-letter]")];
    if (!key || !slot || letters.length === 0) continue;
    const base = slot.getBoundingClientRect().left;
    const last = letters[letters.length - 1].getBoundingClientRect();
    const xs = letters.map((letter) => letter.getBoundingClientRect().left - base);
    xs.push(last.right - base);
    next[key] = xs;
  }
  return next;
}

function nearest(local: number, xs: number[]) {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < xs.length; i += 1) {
    const dist = Math.abs(xs[i] - local);
    if (dist < bestDist) {
      best = i;
      bestDist = dist;
    }
  }
  return best;
}

function Letters({ text, split }: { text: string; split: boolean }) {
  if (!split) return text;
  return [...text].map((letter, index) => (
    <span key={`${letter}-${index}`} data-letter>
      {letter}
    </span>
  ));
}

function ChordWord({
  word,
  mark,
  editing,
  selected,
  dragging,
  xs,
  onSelect,
  onGap,
  onDrag,
}: {
  word: LyricWord;
  mark: CipherMark | null;
  editing: boolean;
  selected: boolean;
  dragging: boolean;
  xs: number[] | undefined;
  onSelect: (word: LyricWord, focus: boolean) => void;
  onGap: (key: string, gap: number) => void;
  onDrag: (key: string | null) => void;
}) {
  const key = wordKey(word);
  const gap = mark?.gap ?? 0;
  const x = xs?.[gap] ?? 0;
  const dragRef = useRef<{ id: number; x: number; moved: boolean } | null>(null);
  const split = editing || Boolean(mark);

  function move(event: PointerEvent<HTMLSpanElement>) {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.id || !xs) return;
    if (Math.abs(event.clientX - drag.x) <= 12) return;
    drag.moved = true;
    onDrag(key);
    const slot = event.currentTarget.parentElement;
    if (!slot) return;
    const local = event.clientX - slot.getBoundingClientRect().left;
    const next = nearest(local, xs);
    if (next !== gap) onGap(key, next);
  }

  const letters = (
    <Letters text={word.text} split={split} />
  );

  return (
    <span data-cipher-word={key} className="inline-flex flex-col">
      {mark ? (
        <span data-slot className="relative block h-[0.66em]">
          {editing && selected
            ? xs?.map((tick, index) => (
                <span
                  key={index}
                  className={cn(
                    "absolute top-0 h-full w-0.5 -translate-x-1/2 bg-foreground/35",
                    index === gap && "bg-foreground",
                    !dragging && index !== gap && "invisible",
                  )}
                  style={{ left: tick }}
                />
              ))
            : null}
          {editing ? (
            <span
              role="slider"
              tabIndex={0}
              aria-label={`Arrastar o acorde ${mark.chord}, ${placeLabel(word.text, gap)}`}
              aria-valuemin={0}
              aria-valuemax={word.text.length}
              aria-valuenow={gap}
              aria-valuetext={placeLabel(word.text, gap)}
              className={chordClass}
              style={{ transform: `translateX(${x}px)` }}
              onPointerDown={(event) => {
                event.stopPropagation();
                onSelect(word, false);
                dragRef.current = { id: event.pointerId, x: event.clientX, moved: false };
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                event.stopPropagation();
                move(event);
              }}
              onPointerUp={(event) => {
                event.stopPropagation();
                if (dragRef.current?.id === event.pointerId) {
                  dragRef.current = null;
                  onDrag(null);
                }
              }}
              onPointerCancel={() => {
                dragRef.current = null;
                onDrag(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight") onGap(key, Math.min(word.text.length, gap + 1));
                else if (event.key === "ArrowLeft") onGap(key, Math.max(0, gap - 1));
                else if (event.key === "Home") onGap(key, 0);
                else if (event.key === "End") onGap(key, word.text.length);
                else return;
                event.preventDefault();
              }}
              onClick={(event) => event.stopPropagation()}
            >
              {mark.chord}
            </span>
          ) : (
            <span className={cn(chordClass, "pointer-events-none cursor-auto pr-0 pb-0")} style={{ transform: `translateX(${x}px)` }}>
              {mark.chord}
            </span>
          )}
        </span>
      ) : null}
      {editing ? (
        <button
          type="button"
          className={cn(
            "m-0 border-0 bg-transparent p-0 text-left font-[inherit] leading-none text-inherit",
            selected && "rounded bg-secondary",
          )}
          aria-label={mark ? `Acorde ${mark.chord} em ${word.text}. Toque para mudar.` : `Colocar acorde em ${word.text}`}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(word, true);
          }}
        >
          {letters}
        </button>
      ) : (
        <span className="leading-none">{letters}</span>
      )}
    </span>
  );
}

export function CipherLyrics({
  stanzas,
  marks,
  editing,
  selected,
  drifted,
  onSelect,
  onGap,
}: {
  stanzas: string[];
  marks: CipherMark[];
  editing: boolean;
  selected: string | null;
  drifted: boolean;
  onSelect: (word: LyricWord, focus: boolean) => void;
  onGap: (key: string, gap: number) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Record<string, number[]>>({});
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const lines = useMemo(() => lyricLines(stanzas), [stanzas]);
  const byWord = useMemo(() => {
    const map = new Map<string, CipherMark>();
    for (const mark of marks) map.set(wordKey(mark), mark);
    return map;
  }, [marks]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const apply = () => {
      const next = measure(root);
      setLayout((current) => (sameLayout(current, next) ? current : next));
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(root);
    return () => observer.disconnect();
  }, [stanzas, marks, editing, selected]);

  return (
    <div
      ref={rootRef}
      className={cn("letra flex flex-col leading-none", editing && "select-none")}
      style={{ fontSize: "var(--lyric-size)", gap: "0.85em" }}
    >
      {drifted ? <p className="text-sm leading-snug">A letra mudou. Confira os acordes.</p> : null}
      {lines.map((stanza, stanzaIndex) => (
        <div key={stanzaIndex} className="flex flex-col gap-[0.6em]">
          {stanza.map((line, lineIndex) => (
            <div key={lineIndex} className="flex flex-wrap items-end gap-x-[0.32em]">
              {line.length === 0 ? <span className="h-[1em]" /> : null}
              {line.map((word) => {
                const key = wordKey(word);
                return (
                  <ChordWord
                    key={key}
                    word={word}
                    mark={byWord.get(key) ?? null}
                    editing={editing}
                    selected={selected === key}
                    dragging={draggingKey === key}
                    xs={layout[key]}
                    onSelect={onSelect}
                    onGap={onGap}
                    onDrag={setDraggingKey}
                  />
                );
              })}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const barButtonClass =
  "h-12 w-auto min-w-12 touch-manipulation rounded-xl border-2 border-foreground bg-background px-3 text-lg font-bold text-foreground shadow-none focus-visible:ring-4";

export function CipherBar({
  word,
  gap,
  value,
  error,
  note,
  pending,
  canClear,
  focusTick,
  onChange,
  onSave,
  onClear,
}: {
  word: string | null;
  gap: number;
  value: string;
  error: string;
  note: string;
  pending: boolean;
  canClear: boolean;
  focusTick: number;
  onChange: (value: string) => void;
  onSave: () => void;
  onClear: () => void;
}) {
  useEffect(() => {
    if (!word || focusTick === 0) return;
    document.getElementById("cifra-acorde")?.focus();
  }, [focusTick, word]);

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-center text-sm leading-snug">
        {word ? (
          <>
            Acorde em {word}
            {canClear ? `, ${placeLabel(word, gap)}` : ""}.
          </>
        ) : (
          "Toque na palavra onde o acorde muda."
        )}
      </p>
      {word ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-0 flex-1 basis-32 flex-col gap-1 text-sm font-bold" htmlFor="cifra-acorde">
            Acorde
            <Input
              id="cifra-acorde"
              value={value}
              autoCapitalize="off"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="done"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "cifra-erro" : undefined}
              className="h-12 rounded-xl border-2 border-foreground bg-card px-3 text-lg font-bold"
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onSave();
                }
              }}
            />
          </label>
          <Button type="button" variant="outline" className={barButtonClass} disabled={pending} onClick={onSave}>
            Salvar
          </Button>
          <Button type="button" variant="outline" className={barButtonClass} disabled={pending || !canClear} onClick={onClear}>
            Apagar
          </Button>
        </div>
      ) : null}
      {error ? (
        <p id="cifra-erro" className="text-center text-sm leading-snug text-destructive">
          {error}
        </p>
      ) : null}
      {note ? (
        <p className="text-center text-sm leading-snug" aria-live="polite">
          {note}
        </p>
      ) : null}
    </div>
  );
}
