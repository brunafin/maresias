"use client";

import { ChordBalloon } from "@/components/chord-diagram";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  cutBlocked,
  lyricLines,
  markKey,
  nearestOpenCut,
  nextOpenCut,
  normalizeChord,
  placeLabel,
  previousOpenCut,
  wordKey,
  type ChordBox,
  type ChordCut,
  type ChordSpot,
  type CipherMark,
  type LyricWord,
} from "@/lib/cipher-marks";
import { chordFamily, chordVariants, NATURAL_CHORDS } from "@/lib/chord-catalog";
import { cn } from "@/lib/utils";
import { useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type Ref } from "react";

const chordLook =
  "absolute left-0 top-0 z-10 min-w-6 text-left text-[0.74em] font-bold leading-none whitespace-nowrap text-[#1b4f8a] normal-case select-none";

function ChordTouch({ name }: { name: string }) {
  const hit = (
    <span
      aria-hidden="true"
      className="absolute -top-3 left-1/2 -bottom-7 min-w-12 -translate-x-1/2 touch-none"
      style={{ width: "max(3rem, calc(100% + 1rem))" }}
    />
  );
  return <span data-chord-label className="relative inline-block">{name}{hit}</span>;
}

const highlightClass = "bg-[#ffe14a] text-inherit box-decoration-clone";

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

function chordIdentity(mark: CipherMark) {
  return mark.id ?? markKey(mark);
}

function spotOf(cut: ChordCut): ChordSpot {
  return { stanza: cut.stanza, line: cut.line, word: cut.word, gap: cut.gap, wordText: cut.wordText };
}

function nameWidth(ruler: HTMLElement | null, text: string) {
  if (!ruler) return text.length * 16;
  ruler.textContent = text;
  return ruler.offsetWidth;
}

function withLead(cuts: ChordCut[], width: number) {
  const lead = Math.max(width, 1) + 4;
  return cuts.map((cut) => {
    if (cut.gap >= 0) return cut;
    const home = cuts.find((item) => item.stanza === cut.stanza && item.line === cut.line && item.word === cut.word && item.gap === 0);
    if (!home) return cut;
    return { ...cut, x: home.x - lead };
  });
}

function chordShift(gap: number, x: number) {
  return gap < 0 ? "translateX(-100%)" : `translateX(${x}px)`;
}

function leadInset(root: HTMLElement) {
  const frame = root.closest<HTMLElement>("[data-lyrics]");
  const leads = [...root.querySelectorAll<HTMLElement>("[data-chord-lead]")];
  if (!frame || leads.length === 0) return "0px";
  const font = Number.parseFloat(getComputedStyle(root).fontSize) || 16;
  const applied = Number.parseFloat(getComputedStyle(root).paddingLeft) || 0;
  const limit = frame.getBoundingClientRect().left + 4;
  let bestNeed = 0;
  let bestEm = 0;
  let bestConstant = 0;
  for (const lead of leads) {
    const box = lead.getBoundingClientRect();
    const label = lead.querySelector("[data-chord-label]")?.getBoundingClientRect();
    const labelWidth = label?.width ?? box.width;
    const fixed = Math.max(0, box.width - labelWidth);
    const em = labelWidth / font;
    const word = lead.closest<HTMLElement>("[data-cipher-word]");
    const natural = (word?.getBoundingClientRect().left ?? box.right) - applied;
    const constant = limit - natural + fixed;
    const need = constant + em * font;
    if (need > bestNeed) {
      bestNeed = need;
      bestEm = em;
      bestConstant = constant;
    }
  }
  if (bestNeed <= 0.5) return "0px";
  if (Math.abs(bestNeed - applied) < 1) return root.style.paddingLeft || "0px";
  return `max(0px, calc(${bestEm.toFixed(4)}em + ${Math.round(bestConstant)}px))`;
}

function measureLine(line: HTMLElement) {
  const cuts: ChordCut[] = [];
  const chords: ChordBox[] = [];
  for (const word of line.querySelectorAll<HTMLElement>("[data-cipher-word]")) {
    const key = word.dataset.cipherWord;
    const text = word.dataset.cipherText;
    if (!key || text === undefined) continue;
    const [stanza, lineIndex, wordIndex] = key.split(":").map(Number);
    if (stanza === undefined || lineIndex === undefined || wordIndex === undefined) continue;
    if (!Number.isInteger(stanza) || !Number.isInteger(lineIndex) || !Number.isInteger(wordIndex)) continue;
    const letters = [...word.querySelectorAll<HTMLElement>("[data-letter]")];
    if (letters.length === 0) continue;
    const top = word.getBoundingClientRect().top;
    const firstLetter = letters[0];
    if (wordIndex === 0 && firstLetter) {
      const first = firstLetter.getBoundingClientRect();
      cuts.push({ stanza, line: lineIndex, word: wordIndex, gap: -1, wordText: text, x: first.left, y: top });
    }
    letters.forEach((letter, index) => {
      cuts.push({
        stanza,
        line: lineIndex,
        word: wordIndex,
        gap: index,
        wordText: text,
        x: letter.getBoundingClientRect().left,
        y: top,
      });
    });
    const last = letters[letters.length - 1].getBoundingClientRect();
    cuts.push({ stanza, line: lineIndex, word: wordIndex, gap: letters.length, wordText: text, x: last.right, y: top });
  }
  for (const chord of line.querySelectorAll<HTMLElement>("[data-chord-key]")) {
    const id = chord.dataset.chordKey;
    if (!id) continue;
    const label = chord.querySelector<HTMLElement>("[data-chord-label]") ?? chord;
    const word = chord.closest<HTMLElement>("[data-cipher-word]");
    const rect = label.getBoundingClientRect();
    chords.push({ id, x: rect.left, y: word?.getBoundingClientRect().top ?? rect.top, width: rect.width });
  }
  return { cuts, chords };
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
  marks,
  editing,
  reserve,
  selected,
  selectedId,
  draggingId,
  spotGap,
  showGuides,
  openKey,
  xs,
  onSelect,
  onChordDown,
  onChordKey,
  onToggleDiagram,
  onAnchor,
}: {
  word: LyricWord;
  marks: CipherMark[];
  editing: boolean;
  reserve: boolean;
  selected: boolean;
  selectedId: string | null;
  draggingId: string | null;
  spotGap: number | null;
  showGuides: boolean;
  openKey: string | null;
  xs: number[] | undefined;
  onSelect: (word: LyricWord, focus: boolean) => void;
  onChordDown: (mark: CipherMark, pointerId: number, x: number, y: number) => void;
  onChordKey: (mark: CipherMark, key: string) => void;
  onToggleDiagram: (key: string) => void;
  onAnchor: (key: string, node: HTMLButtonElement | null) => void;
}) {
  const key = wordKey(word);
  const open = reserve || marks.length > 0;
  const dragged = marks.find((mark) => mark.id === draggingId);
  const chosen = marks.find((mark) => mark.id === selectedId);
  const guide = dragged?.gap ?? spotGap ?? chosen?.gap ?? null;
  const label =
    marks.length === 0
      ? `Colocar acorde em ${word.text}`
      : marks.length === 1
        ? `Acorde ${marks[0]?.chord} em ${word.text}. Toque para mudar.`
        : `Acordes em ${word.text}. Toque para escolher.`;

  return (
    <span data-cipher-word={key} data-cipher-text={word.text} className="inline-flex flex-col">
      {open ? (
        <span data-slot className={cn("relative block h-[0.96em]", editing && "z-10")}>
          {editing && word.word === 0 ? (
            <span
              className={cn(
                "absolute top-0 left-0 h-full w-0.5 -translate-x-full bg-foreground/35",
                guide === -1 && "bg-foreground",
                !showGuides && guide !== -1 && "invisible",
              )}
            />
          ) : null}
          {editing
            ? xs?.map((tick, index) => (
                <span
                  key={index}
                  className={cn(
                    "absolute top-0 h-full w-0.5 -translate-x-1/2 bg-foreground/35",
                    index === guide && "bg-foreground",
                    !showGuides && index !== guide && "invisible",
                    guide === null && !showGuides && "invisible",
                  )}
                  style={{ left: tick }}
                />
              ))
            : null}
          {marks.map((mark) => {
            const id = chordIdentity(mark);
            const x = xs?.[mark.gap] ?? 0;
            const diagramOpen = openKey === id;
            return editing ? (
              <span
                key={id}
                role="slider"
                tabIndex={0}
                data-chord-key={id}
                data-chord-lead={mark.gap < 0 ? "" : undefined}
                aria-label={`Arrastar o acorde ${mark.chord}, ${placeLabel(word.text, mark.gap)}`}
                aria-valuemin={word.word === 0 ? -1 : 0}
                aria-valuemax={word.text.length}
                aria-valuenow={mark.gap}
                aria-valuetext={placeLabel(word.text, mark.gap)}
                className={cn(chordLook, "cursor-grab touch-none pb-2", mark.gap < 0 ? "pl-3 text-right" : "pr-3")}
                style={{
                  transform: chordShift(mark.gap, x),
                  zIndex: mark.id === selectedId || mark.id === draggingId ? 20 : 10,
                }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  onChordDown(mark, event.pointerId, event.clientX, event.clientY);
                }}
                onKeyDown={(event) => {
                  if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
                  event.preventDefault();
                  onChordKey(mark, event.key);
                }}
                onClick={(event) => event.stopPropagation()}
              >
                <ChordTouch name={mark.chord} />
              </span>
            ) : (
              <button
                key={id}
                type="button"
                ref={(node) => onAnchor(id, node)}
                data-chord-button
                data-chord-key={id}
                data-chord-lead={mark.gap < 0 ? "" : undefined}
                aria-expanded={diagramOpen}
                aria-haspopup="dialog"
                aria-controls={diagramOpen ? "desenho-acorde" : undefined}
                aria-label={`Ver o desenho de ${mark.chord}`}
                className={cn(chordLook, "cursor-pointer touch-manipulation pb-0", mark.gap < 0 ? "pl-3 text-right" : "pr-0")}
                style={{ transform: chordShift(mark.gap, x) }}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleDiagram(id);
                }}
              >
                <span aria-hidden="true" className="absolute -top-3 -right-2 -left-2 bottom-0" />
                <span data-chord-label>{mark.chord}</span>
              </button>
            );
          })}
        </span>
      ) : null}
      {editing ? (
        <button
          type="button"
          className={cn(
            "m-0 border-0 bg-transparent p-0 text-left font-[inherit] leading-none text-inherit",
            selected && cn(highlightClass, "px-[0.08em]"),
          )}
          aria-label={label}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(word, true);
          }}
        >
          <Letters text={word.text} split={open} />
        </button>
      ) : (
        <span className="leading-none">
          <Letters text={word.text} split={open} />
        </span>
      )}
    </span>
  );
}

function LyricLine({
  stanza,
  line,
  words,
  marks,
  editing,
  selected,
  selectedId,
  spot,
  draggingId,
  openKey,
  layout,
  onSelect,
  onSelectMark,
  onMove,
  onDrag,
  onToggleDiagram,
  onAnchor,
}: {
  stanza: number;
  line: number;
  words: LyricWord[];
  marks: CipherMark[];
  editing: boolean;
  selected: string | null;
  selectedId: string | null;
  spot: ChordSpot | null;
  draggingId: string | null;
  openKey: string | null;
  layout: Record<string, number[]>;
  onSelect: (word: LyricWord, focus: boolean) => void;
  onSelectMark: (id: string, focus: boolean) => void;
  onMove: (id: string, place: ChordSpot) => void;
  onDrag: (id: string | null) => void;
  onToggleDiagram: (key: string) => void;
  onAnchor: (key: string, node: HTMLButtonElement | null) => void;
}) {
  const lineRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; id: string; moved: boolean } | null>(null);
  const reserve = editing && (marks.length > 0 || words.some((word) => wordKey(word) === selected));
  const showGuides = Boolean(draggingId && marks.some((mark) => mark.id === draggingId));

  function shift(id: string, cut: ChordCut) {
    const mark = marks.find((item) => item.id === id);
    if (!mark || (mark.word === cut.word && mark.line === cut.line && mark.gap === cut.gap)) return;
    onMove(id, spotOf(cut));
  }

  function place(id: string, clientX: number, clientY: number) {
    const node = lineRef.current;
    if (!node) return;
    const measured = measureLine(node);
    const width = measured.chords.find((chord) => chord.id === id)?.width ?? 0;
    const cuts = withLead(measured.cuts, width);
    const cut = nearestOpenCut(clientX, clientY, cuts, measured.chords, id, width);
    if (cut) shift(id, cut);
  }

  function step(mark: CipherMark, key: string) {
    if (!mark.id || !lineRef.current) return;
    const measured = measureLine(lineRef.current);
    const width = measured.chords.find((chord) => chord.id === mark.id)?.width ?? 0;
    const cuts = withLead(measured.cuts, width);
    const here = cuts.find((cut) => cut.word === mark.word && cut.gap === mark.gap);
    if (!here) return;
    let cut: ChordCut | null = null;
    if (key === "ArrowRight") cut = nextOpenCut(here, cuts, measured.chords, mark.id, width);
    else if (key === "ArrowLeft") cut = previousOpenCut(here, cuts, measured.chords, mark.id, width);
    else {
      const inWord = cuts
        .filter((item) => item.word === mark.word && !cutBlocked(item, width, measured.chords, mark.id ?? null))
        .sort((left, right) => left.gap - right.gap);
      cut = key === "Home" ? (inWord[0] ?? null) : (inWord[inWord.length - 1] ?? null);
    }
    if (cut) shift(mark.id, cut);
  }

  function endDrag(pointerId: number) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== pointerId) return;
    dragRef.current = null;
    if (lineRef.current) lineRef.current.style.touchAction = "";
    onDrag(null);
  }

  return (
    <div
      ref={lineRef}
      data-cipher-line={`${stanza}:${line}`}
      className="flex flex-wrap items-end gap-x-[0.32em]"
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || event.pointerId !== drag.pointerId) return;
        event.stopPropagation();
        if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) <= 12) return;
        drag.moved = true;
        onDrag(drag.id);
        place(drag.id, event.clientX, event.clientY);
      }}
      onPointerUp={(event) => endDrag(event.pointerId)}
      onPointerCancel={(event) => endDrag(event.pointerId)}
    >
      {words.length === 0 ? <span className="h-[1em]" /> : null}
      {words.map((word) => {
        const key = wordKey(word);
        return (
          <ChordWord
            key={key}
            word={word}
            marks={marks.filter((mark) => wordKey(mark) === key)}
            editing={editing}
            reserve={reserve}
            selected={selected === key}
            selectedId={selectedId}
            draggingId={draggingId}
            spotGap={spot && wordKey(spot) === key ? spot.gap : null}
            showGuides={showGuides}
            openKey={openKey}
            xs={layout[key]}
            onSelect={onSelect}
            onChordDown={(mark, pointerId, x, y) => {
              if (!mark.id || !lineRef.current) return;
              onSelectMark(mark.id, false);
              dragRef.current = { pointerId, x, y, id: mark.id, moved: false };
              lineRef.current.style.touchAction = "none";
              lineRef.current.setPointerCapture(pointerId);
            }}
            onChordKey={step}
            onToggleDiagram={onToggleDiagram}
            onAnchor={onAnchor}
          />
        );
      })}
    </div>
  );
}

export type CipherLyricsHandle = {
  nextPlace: (anchor: ChordSpot) => ChordSpot | null;
  fitPlace: (chord: string, place: ChordSpot, selfId: string | null) => ChordSpot | null;
};

export function CipherLyrics({
  stanzas,
  marks,
  editing,
  selected,
  selectedId,
  spot,
  drifted,
  onSelect,
  onSelectMark,
  onMove,
  ref,
}: {
  stanzas: string[];
  marks: CipherMark[];
  editing: boolean;
  selected: string | null;
  selectedId: string | null;
  spot: ChordSpot | null;
  drifted: boolean;
  onSelect: (word: LyricWord, focus: boolean) => void;
  onSelectMark: (id: string, focus: boolean) => void;
  onMove: (id: string, place: ChordSpot) => void;
  ref?: Ref<CipherLyricsHandle>;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLSpanElement>(null);
  const anchors = useRef(new Map<string, HTMLButtonElement>());
  const [layout, setLayout] = useState<Record<string, number[]>>({});
  const [leadPad, setLeadPad] = useState("0px");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [positionIndex, setPositionIndex] = useState(0);
  const lines = useMemo(() => lyricLines(stanzas), [stanzas]);
  const byChord = useMemo(() => {
    const map = new Map<string, CipherMark>();
    for (const mark of marks) map.set(chordIdentity(mark), mark);
    return map;
  }, [marks]);
  const byLine = useMemo(() => {
    const map = new Map<string, CipherMark[]>();
    for (const mark of marks) {
      const key = `${mark.stanza}:${mark.line}`;
      const list = map.get(key);
      if (list) list.push(mark);
      else map.set(key, [mark]);
    }
    return map;
  }, [marks]);

  const openChord = openKey ? (byChord.get(openKey)?.chord ?? null) : null;

  useImperativeHandle(ref, () => ({
    nextPlace(anchor) {
      const line = rootRef.current?.querySelector<HTMLElement>(`[data-cipher-line="${anchor.stanza}:${anchor.line}"]`);
      if (!line) return null;
      const measured = measureLine(line);
      const width = nameWidth(rulerRef.current, "C");
      const cuts = withLead(measured.cuts, width);
      const here = cuts.find((cut) => cut.word === anchor.word && cut.gap === anchor.gap);
      if (!here) return null;
      const next = nextOpenCut(here, cuts, measured.chords, null, width);
      return next ? spotOf(next) : null;
    },
    fitPlace(chord, place, selfId) {
      const line = rootRef.current?.querySelector<HTMLElement>(`[data-cipher-line="${place.stanza}:${place.line}"]`);
      if (!line) return place;
      const measured = measureLine(line);
      const width = nameWidth(rulerRef.current, chord);
      const cuts = withLead(measured.cuts, width);
      const here = cuts.find((cut) => cut.word === place.word && cut.gap === place.gap);
      if (!here || !cutBlocked(here, width, measured.chords, selfId)) return place;
      if (selfId) {
        const nearest = nearestOpenCut(here.x, here.y, cuts, measured.chords, selfId, width);
        return nearest ? spotOf(nearest) : place;
      }
      const next = nextOpenCut(here, cuts, measured.chords, null, width);
      return next ? spotOf(next) : null;
    },
  }));

  useEffect(() => {
    if (editing) setOpenKey(null);
  }, [editing]);

  useEffect(() => {
    if (openKey && !byChord.has(openKey)) setOpenKey(null);
  }, [byChord, openKey]);

  useEffect(() => {
    setPositionIndex(0);
  }, [openKey, openChord]);

  useEffect(() => {
    if (!openKey) return;
    const key = openKey;
    function dismiss(event: Event) {
      const raw = event.target;
      const target = raw instanceof Element ? raw : raw instanceof Node ? raw.parentElement : null;
      if (!target) return;
      if (target.closest("[data-chord-popover], [data-chord-button]")) return;
      if (target.closest("[data-lyrics]")) {
        const stopClick = (click: Event) => {
          click.stopPropagation();
          click.preventDefault();
        };
        document.addEventListener("click", stopClick, true);
        window.setTimeout(() => document.removeEventListener("click", stopClick, true), 0);
      }
      setOpenKey(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      const anchor = anchors.current.get(key);
      setOpenKey(null);
      anchor?.focus({ preventScroll: true });
    }
    function onScroll() {
      setOpenKey(null);
    }
    const scroller = rootRef.current?.closest("[data-lyrics]");
    document.addEventListener("pointerdown", dismiss, true);
    document.addEventListener("keydown", onKey);
    scroller?.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", dismiss, true);
      document.removeEventListener("keydown", onKey);
      scroller?.removeEventListener("scroll", onScroll);
    };
  }, [openKey]);

  function toggleDiagram(key: string) {
    setOpenKey((current) => (current === key ? null : key));
    setPositionIndex(0);
  }

  function setAnchor(key: string, node: HTMLButtonElement | null) {
    if (node) anchors.current.set(key, node);
    else anchors.current.delete(key);
  }

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const apply = () => {
      const next = measure(root);
      setLayout((current) => (sameLayout(current, next) ? current : next));
      if (draggingId) return;
      setLeadPad((current) => {
        const pad = leadInset(root);
        return pad === current ? current : pad;
      });
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(root);
    const frame = root.closest("[data-lyrics]");
    if (frame) observer.observe(frame);
    window.addEventListener("resize", apply);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, [stanzas, marks, editing, selected, spot, draggingId]);

  return (
    <div
      ref={rootRef}
      className={cn("letra relative flex flex-col leading-none", editing && "select-none")}
      style={{ fontSize: "var(--lyric-size)", gap: "0.85em", paddingLeft: leadPad === "0px" ? undefined : leadPad }}
    >
      <span ref={rulerRef} className="pointer-events-none invisible absolute top-0 left-0 text-[0.74em] font-bold whitespace-pre" aria-hidden="true" />
      {drifted ? <p className="text-sm leading-snug">A letra mudou. Confira os acordes.</p> : null}
      {lines.map((stanza, stanzaIndex) => (
        <div key={stanzaIndex} className="flex flex-col gap-[0.6em]">
          {stanza.map((line, lineIndex) => (
            <LyricLine
              key={lineIndex}
              stanza={stanzaIndex}
              line={lineIndex}
              words={line}
              marks={byLine.get(`${stanzaIndex}:${lineIndex}`) ?? []}
              editing={editing}
              selected={selected}
              selectedId={selectedId}
              spot={spot}
              draggingId={draggingId}
              openKey={openKey}
              layout={layout}
              onSelect={onSelect}
              onSelectMark={onSelectMark}
              onMove={onMove}
              onDrag={setDraggingId}
              onToggleDiagram={toggleDiagram}
              onAnchor={setAnchor}
            />
          ))}
        </div>
      ))}
      {openKey && openChord && !editing ? (
        <ChordBalloon
          chord={openChord}
          anchor={anchors.current.get(openKey) ?? null}
          index={positionIndex}
          onIndex={setPositionIndex}
        />
      ) : null}
    </div>
  );
}

const barButtonClass =
  "h-12 w-auto min-w-12 touch-manipulation rounded-xl border-2 border-foreground bg-background px-3 text-lg font-bold text-foreground shadow-none focus-visible:ring-4";

const chordKeyClass =
  "flex h-12 min-w-0 flex-1 items-center justify-center rounded-lg border-2 border-foreground px-0.5 font-bold leading-none normal-case focus-visible:ring-4 focus-visible:ring-foreground focus-visible:outline-none disabled:opacity-50";

export function CipherBar({
  word,
  gap,
  value,
  error,
  note,
  pending,
  canClear,
  canAdd,
  focusTick,
  onChange,
  onSave,
  onClear,
  onAdd,
}: {
  word: string | null;
  gap: number;
  value: string;
  error: string;
  note: string;
  pending: boolean;
  canClear: boolean;
  canAdd: boolean;
  focusTick: number;
  onChange: (value: string) => void;
  onSave: (chord?: string) => void;
  onClear: () => void;
  onAdd: () => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const current = normalizeChord(value);
  const [openRoot, setOpenRoot] = useState<string | null>(null);
  const variants = openRoot ? chordVariants(openRoot) : [];

  useEffect(() => {
    if (!word || focusTick === 0) return;
    listRef.current?.focus();
  }, [focusTick, word]);

  useEffect(() => {
    if (!current) {
      setOpenRoot(null);
      return;
    }
    const family = chordFamily(current);
    if (!family) {
      setOpenRoot(null);
      return;
    }
    if (current !== family) {
      setOpenRoot(family);
      return;
    }
    setOpenRoot((open) => (open === family ? open : null));
  }, [current]);

  function choose(chord: string, root: string) {
    onSave(chord);
    setOpenRoot(root);
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-center text-base leading-snug">
        {word ? (
          <>
            Acorde em <mark className={cn(highlightClass, "px-1 font-bold")}>{word}</mark>, {placeLabel(word, gap)}.
          </>
        ) : (
          "Toque na palavra onde o acorde muda."
        )}
      </p>
      {word ? (
        <>
          <div
            ref={listRef}
            tabIndex={-1}
            role="group"
            aria-label="Acordes maiores"
            className="flex w-full gap-1 outline-none"
          >
            {NATURAL_CHORDS.map((note) => {
              const selected = note === current;
              const expanded = openRoot === note;
              return (
                <button
                  key={note}
                  type="button"
                  aria-pressed={selected}
                  aria-expanded={expanded}
                  aria-controls={expanded ? "cifra-variantes" : undefined}
                  aria-label={`${note}, maior`}
                  disabled={pending}
                  className={cn(
                    chordKeyClass,
                    "text-lg",
                    selected
                      ? "bg-foreground text-background"
                      : expanded
                        ? "bg-secondary text-foreground"
                        : "bg-card text-foreground",
                  )}
                  onClick={() => choose(note, note)}
                >
                  {note}
                </button>
              );
            })}
          </div>
          {openRoot && variants.length > 0 ? (
            <div id="cifra-variantes" role="group" aria-label={`Variantes de ${openRoot}`} className="flex w-full flex-wrap gap-1">
              {variants.map((cell) => (
                <button
                  key={cell.chord}
                  type="button"
                  aria-pressed={cell.chord === current}
                  aria-label={`${cell.chord}, ${cell.label}`}
                  disabled={pending}
                  className={cn(
                    chordKeyClass,
                    "min-w-12",
                    cell.chord.length >= 3 ? "text-sm" : "text-lg",
                    cell.chord === current ? "bg-foreground text-background" : "bg-card text-foreground",
                  )}
                  onClick={() => choose(cell.chord, openRoot)}
                >
                  {cell.chord}
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex w-full items-center gap-2">
            <label className="block w-1/3 shrink-0" htmlFor="cifra-acorde">
              <span className="sr-only">Outro acorde</span>
              <Input
                id="cifra-acorde"
                value={value}
                placeholder="Outro"
                autoCapitalize="off"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="done"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "cifra-erro" : undefined}
                className="h-12 rounded-xl border-2 border-foreground bg-card px-3 text-lg font-bold text-[#1b4f8a] normal-case placeholder:text-base placeholder:font-normal placeholder:text-muted-foreground"
                onChange={(event) => onChange(event.target.value)}
                onBlur={() => {
                  if (value.trim()) onSave();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onSave();
                  }
                }}
              />
            </label>
            {canAdd ? (
              <Button type="button" variant="outline" className={cn(barButtonClass, "min-w-0 flex-1 px-2 text-base")} disabled={pending} onClick={onAdd}>
                Mais um acorde
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className={cn(barButtonClass, "ml-auto shrink-0 border-destructive px-0 text-destructive hover:bg-destructive/10 hover:text-destructive")}
              aria-label="Apagar o acorde"
              disabled={pending || !canClear}
              onClick={onClear}
            >
              <Trash2 className="size-6" strokeWidth={2.25} aria-hidden="true" />
            </Button>
          </div>
        </>
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
