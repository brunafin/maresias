"use client";

import { chordPositions, type ChordPosition } from "@/lib/chord-shapes";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const LEFT = 36;
const TOP = 26;
const STRING_GAP = 22;
const FRET_GAP = 30;
const DOT = 8;

const pagerButtonClass =
  "h-12 w-full min-w-12 touch-manipulation rounded-xl border-2 border-foreground bg-background px-2 text-lg font-bold text-foreground focus-visible:ring-4 focus-visible:outline-none disabled:opacity-40";

function stringX(string: number) {
  return LEFT + string * STRING_GAP;
}

function windowOf(position: ChordPosition) {
  const pressed = position.frets.filter((fret) => fret > 0);
  const min = pressed.length ? Math.min(...pressed) : 1;
  const max = pressed.length ? Math.max(...pressed) : 1;
  const nut = position.frets.some((fret) => fret === 0) || min <= 1;
  const baseFret = nut ? 1 : min;
  const fretCount = Math.max(4, max - baseFret + 1);
  return { nut, baseFret, fretCount };
}

export function ChordDiagram({ position }: { position: ChordPosition }) {
  const { nut, baseFret, fretCount } = windowOf(position);
  const width = LEFT + STRING_GAP * 5 + 14;
  const height = TOP + FRET_GAP * fretCount + 8;
  const gridRight = stringX(5);
  const barre = position.barre;

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="text-foreground"
    >
      {Array.from({ length: fretCount + 1 }, (_, index) => (
        <line
          key={`fret-${index}`}
          x1={LEFT}
          x2={gridRight}
          y1={TOP + index * FRET_GAP}
          y2={TOP + index * FRET_GAP}
          stroke="currentColor"
          strokeWidth={index === 0 && nut ? 6 : 2}
        />
      ))}
      {Array.from({ length: 6 }, (_, string) => (
        <line
          key={`string-${string}`}
          x1={stringX(string)}
          x2={stringX(string)}
          y1={TOP}
          y2={TOP + fretCount * FRET_GAP}
          stroke="currentColor"
          strokeWidth={2}
        />
      ))}
      {barre ? (
        <rect
          x={stringX(barre.from) - DOT}
          y={TOP + (barre.fret - baseFret + 0.5) * FRET_GAP - DOT}
          width={stringX(barre.to) - stringX(barre.from) + DOT * 2}
          height={DOT * 2}
          rx={DOT}
          fill="currentColor"
        />
      ) : null}
      {position.frets.map((fret, string) => {
        if (fret <= 0) return null;
        if (barre && fret === barre.fret && string >= barre.from && string <= barre.to) return null;
        const row = fret - baseFret;
        if (row < 0 || row >= fretCount) return null;
        return <circle key={`dot-${string}`} cx={stringX(string)} cy={TOP + (row + 0.5) * FRET_GAP} r={DOT} fill="currentColor" />;
      })}
      {position.frets.map((fret, string) => {
        if (fret > 0) return null;
        return (
          <text
            key={`mark-${string}`}
            x={stringX(string)}
            y={13}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="15"
            fontWeight="700"
            fill="currentColor"
          >
            {fret === 0 ? "O" : "X"}
          </text>
        );
      })}
      {nut ? null : (
        <text
          x={LEFT - 8}
          y={TOP + FRET_GAP / 2}
          textAnchor="end"
          dominantBaseline="middle"
          fontSize="16"
          fontWeight="700"
          fill="currentColor"
        >
          {baseFret}
        </text>
      )}
    </svg>
  );
}

function place(anchor: DOMRect, popover: DOMRect) {
  const margin = 8;
  const left = Math.max(margin, Math.min(anchor.left + anchor.width / 2 - popover.width / 2, window.innerWidth - popover.width - margin));
  const below = anchor.bottom + margin;
  const above = anchor.top - popover.height - margin;
  let top = below;
  if (below + popover.height > window.innerHeight - margin && above >= margin) top = above;
  if (top < margin) top = margin;
  if (top + popover.height > window.innerHeight - margin) top = Math.max(margin, window.innerHeight - popover.height - margin);
  return { top, left };
}

export function ChordBalloon({
  chord,
  anchor,
  index,
  onIndex,
}: {
  chord: string;
  anchor: HTMLElement | null;
  index: number;
  onIndex: (index: number) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const positions = chordPositions(chord);
  const current = positions.length === 0 ? 0 : Math.min(index, positions.length - 1);
  const position = positions[current];
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!anchor || !dialog) return;
    const update = () => {
      const next = place(anchor.getBoundingClientRect(), dialog.getBoundingClientRect());
      setBox((currentBox) => (currentBox && currentBox.top === next.top && currentBox.left === next.left ? currentBox : next));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(anchor);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [anchor, chord, current]);

  useEffect(() => {
    dialogRef.current?.focus({ preventScroll: true });
  }, [chord]);

  if (!anchor || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={dialogRef}
      id="desenho-acorde"
      role="dialog"
      aria-modal="false"
      aria-labelledby="desenho-acorde-titulo"
      tabIndex={-1}
      data-chord-popover
      className="fixed z-40 w-[min(22rem,calc(100vw-1rem))] rounded-2xl border-[3px] border-foreground bg-card p-3 text-base text-foreground normal-case shadow-none outline-none select-none"
      style={{ top: box?.top ?? 0, left: box?.left ?? 0, visibility: box ? "visible" : "hidden" }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <p id="desenho-acorde-titulo" className="text-center text-3xl leading-none font-bold text-[#1b4f8a]">
        {chord}
      </p>
      {position ? (
        <div className="mt-2 flex flex-col items-center gap-2">
          <ChordDiagram position={position} />
          {positions.length > 1 ? (
            <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
              <button
                type="button"
                className={pagerButtonClass}
                disabled={current === 0}
                aria-label="Posição anterior"
                onClick={() => onIndex(current - 1)}
              >
                Anterior
              </button>
              <p className="min-w-14 text-center text-base font-bold" aria-live="polite">
                {current + 1} de {positions.length}
              </p>
              <button
                type="button"
                className={pagerButtonClass}
                disabled={current === positions.length - 1}
                aria-label="Próxima posição"
                onClick={() => onIndex(current + 1)}
              >
                Próxima
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="px-2 py-6 text-center text-base leading-snug">Sem desenho para este acorde.</p>
      )}
    </div>,
    document.body,
  );
}
