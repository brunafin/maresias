"use client";

import {
  lyricKey,
  lyricLines,
  normalizeChord,
  placeMarks,
  wordKey,
  type ChordSpot,
  type CipherMark,
  type LyricWord,
} from "@/lib/cipher-marks";
import { lyricStanzas } from "@/lib/clean-lyrics";
import { transposeMarks, wrapSemitone } from "@/lib/transpose";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Lyric = { title: string; artist: string; lyrics: string };

type Doc = {
  exists: boolean;
  enabled: boolean;
  marks: CipherMark[];
  shared: boolean;
  mine: boolean;
  self: boolean;
  owner: string | null;
  ownerName: string | null;
  creditNickname: string | null;
  creditName: string | null;
};

type SaveResult = {
  ok?: boolean;
  exists?: boolean;
  enabled?: boolean;
  marks?: CipherMark[];
  creditNickname?: string | null;
  creditName?: string | null;
};

function savedCredit(result: { creditNickname?: string | null; creditName?: string | null }) {
  return {
    creditNickname: typeof result.creditNickname === "string" ? result.creditNickname : null,
    creditName: typeof result.creditName === "string" ? result.creditName : null,
  };
}

function readyMarks(marks: CipherMark[]) {
  const next: CipherMark[] = [];
  for (const mark of marks) {
    const chord = normalizeChord(mark.chord);
    if (chord) next.push(chord === mark.chord ? mark : { ...mark, chord });
  }
  return next;
}

function newId() {
  return crypto.randomUUID();
}

function stamp(marks: CipherMark[]) {
  return marks.map((mark) => (mark.id ? mark : { ...mark, id: newId() }));
}

function storedMark(mark: CipherMark): CipherMark {
  return {
    stanza: mark.stanza,
    line: mark.line,
    word: mark.word,
    gap: mark.gap,
    wordText: mark.wordText,
    chord: mark.chord,
  };
}

function toSpot(mark: Pick<CipherMark, "stanza" | "line" | "word" | "gap" | "wordText">): ChordSpot {
  return {
    stanza: mark.stanza,
    line: mark.line,
    word: mark.word,
    gap: mark.gap,
    wordText: mark.wordText,
  };
}

export type ChordFit = (chord: string, place: ChordSpot, selfId: string | null) => ChordSpot | null;

export function useCipher(songId: string, lyric: Lyric | null, from?: string | null) {
  const invalid = !/^\d+$/.test(songId);
  const owner = from?.trim().toLowerCase() || "";
  const [seenId, setSeenId] = useState(`${songId}:${owner}`);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CipherMark[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [spot, setSpot] = useState<ChordSpot | null>(null);
  const [focusTick, setFocusTick] = useState(0);
  const [chordInput, setChordInput] = useState("");
  const [chordError, setChordError] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [confirmCopy, setConfirmCopy] = useState(false);
  const router = useRouter();

  if (seenId !== `${songId}:${owner}`) {
    setSeenId(`${songId}:${owner}`);
    setDoc(null);
    setEditing(false);
    setDraft(null);
    setSelectedId(null);
    setSpot(null);
    setChordInput("");
    setChordError("");
    setNote("");
    setPending(false);
    setConfirmCopy(false);
  }

  useEffect(() => {
    if (invalid) return;
    const controller = new AbortController();
    let cancelled = false;
    const timer = window.setTimeout(() => controller.abort(), 8000);
    const query = owner ? `/api/cifra?id=${songId}&de=${encodeURIComponent(owner)}` : `/api/cifra?id=${songId}`;
    fetch(query, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as SaveResult & {
          showCipher?: boolean;
          signedIn?: boolean;
          shared?: boolean;
          mine?: boolean;
          self?: boolean;
          nickname?: string;
          name?: string | null;
          creditNickname?: string | null;
          creditName?: string | null;
        };
        if (cancelled || !response.ok || !body.ok || !body.showCipher || !body.signedIn) return;
        const shared = Boolean(body.shared);
        const exists = Boolean(body.exists);
        setDoc({
          exists,
          enabled: shared ? exists : Boolean(body.enabled),
          marks: readyMarks(Array.isArray(body.marks) ? body.marks : []),
          shared,
          mine: Boolean(body.mine),
          self: Boolean(body.self),
          owner: typeof body.nickname === "string" ? body.nickname : owner || null,
          ownerName: typeof body.name === "string" ? body.name : null,
          ...savedCredit(body),
        });
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
  }, [songId, invalid, owner]);

  const stanzas = useMemo(() => (lyric ? lyricStanzas(lyric.lyrics) : []), [lyric]);
  const placement = useMemo(
    () => placeMarks(stanzas, editing ? (draft ?? []) : (doc?.marks ?? [])),
    [stanzas, editing, draft, doc?.marks],
  );
  const showChords = editing || Boolean(doc?.enabled);
  const viewMarks = showChords ? placement.placed : [];

  const selectedMark = selectedId ? (viewMarks.find((mark) => mark.id === selectedId) ?? null) : null;
  const anchor = selectedMark ? toSpot(selectedMark) : spot;

  const selectedWord = useMemo(() => {
    const place = selectedMark ?? spot;
    if (!place) return null;
    return lyricLines(stanzas)[place.stanza]?.[place.line]?.[place.word] ?? null;
  }, [selectedMark, spot, stanzas]);

  const selected = selectedWord ? wordKey(selectedWord) : null;

  async function send(body: Record<string, unknown>) {
    const response = await fetch("/api/cifra", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as SaveResult;
    if (!response.ok || !result.ok) return null;
    return result;
  }

  function startEdit() {
    if (!lyric || !doc || doc.shared) return;
    const next = placeMarks(stanzas, doc.marks);
    setDraft(stamp([...next.placed, ...next.loose]));
    setEditing(true);
    setSelectedId(null);
    setSpot(null);
    setChordInput("");
    setChordError("");
    setNote("");
  }

  function marksOn(word: LyricWord) {
    return (draft ?? []).filter((mark) => wordKey(mark) === wordKey(word)).sort((left, right) => left.gap - right.gap);
  }

  function selectWord(word: LyricWord, focus: boolean) {
    const marks = marksOn(word);
    const current = marks.find((mark) => mark.id === selectedId);
    if (!current) {
      const mark = marks[0];
      if (mark?.id) {
        setSpot(null);
        setSelectedId(mark.id);
        setChordInput(mark.chord);
      } else {
        setSelectedId(null);
        setSpot({ stanza: word.stanza, line: word.line, word: word.word, gap: 0, wordText: word.text });
        setChordInput("");
      }
      setChordError("");
      setNote("");
    }
    if (focus) setFocusTick((value) => value + 1);
  }

  function selectMark(id: string, focus: boolean) {
    const mark = (draft ?? []).find((item) => item.id === id);
    if (!mark) return;
    setSpot(null);
    setSelectedId(id);
    setChordInput(mark.chord);
    setChordError("");
    setNote("");
    if (focus) setFocusTick((value) => value + 1);
  }

  function moveMark(id: string, place: ChordSpot) {
    setDraft((current) => {
      if (!current) return current;
      return current.map((mark) => (mark.id === id ? { ...mark, ...place } : mark));
    });
    setSpot(null);
    setSelectedId(id);
  }

  function beginAt(place: ChordSpot | null) {
    if (!place) {
      setChordError("");
      setNote("Não cabe outro acorde nesta linha.");
      return;
    }
    setSelectedId(null);
    setSpot(place);
    setChordInput("");
    setChordError("");
    setNote("");
    setFocusTick((value) => value + 1);
  }

  function saveChord(raw?: string, fit?: ChordFit) {
    const chord = normalizeChord(typeof raw === "string" ? raw : chordInput);
    if (!chord) {
      setNote("");
      setChordError("Use o acorde assim: C, Cm, G7, F#.");
      return;
    }
    if (selectedId) {
      const previous = (draft ?? []).find((mark) => mark.id === selectedId);
      if (!previous) return;
      const fitted = fit?.(chord, toSpot(previous), selectedId) ?? toSpot(previous);
      const taken = (draft ?? []).some(
        (mark) =>
          mark.id !== selectedId &&
          mark.stanza === fitted.stanza &&
          mark.line === fitted.line &&
          mark.word === fitted.word &&
          mark.gap === fitted.gap,
      );
      const place = taken ? toSpot(previous) : fitted;
      setDraft((current) => (current ?? []).map((mark) => (mark.id === selectedId ? { ...mark, ...place, chord } : mark)));
      setChordInput(chord);
      setChordError("");
      setNote("Salvo.");
      return;
    }
    if (!spot) return;
    const place = fit?.(chord, spot, null);
    if (!place) {
      setChordError("");
      setNote("Não cabe outro acorde nesta linha.");
      return;
    }
    if ((draft ?? []).some((mark) => mark.stanza === place.stanza && mark.line === place.line && mark.word === place.word && mark.gap === place.gap)) {
      setChordError("");
      setNote("Não cabe outro acorde nesta linha.");
      return;
    }
    const id = newId();
    setDraft((current) => [...(current ?? []), { ...place, chord, id }]);
    setSelectedId(id);
    setSpot(null);
    setChordInput(chord);
    setChordError("");
    setNote("Salvo.");
  }

  function clearChord() {
    const mark = (draft ?? []).find((item) => item.id === selectedId);
    if (!mark) return;
    setDraft((current) => (current ?? []).filter((item) => item.id !== selectedId));
    setSelectedId(null);
    setSpot(toSpot(mark));
    setChordInput("");
    setChordError("");
    setNote("Apagado.");
  }

  async function finishEdit() {
    if (!lyric || pending) return false;
    const next = placeMarks(stanzas, draft ?? []);
    const marks = [...next.placed, ...next.loose].map(storedMark);
    setPending(true);
    setNote("");
    try {
      const result = await send({
        songId: Number(songId),
        title: lyric.title,
        artist: lyric.artist,
        lyricHash: lyricKey(lyric.lyrics),
        marks,
      });
      if (!result) {
        setNote("Não conseguimos guardar a cifra agora.");
        return false;
      }
      setDoc({
        exists: Boolean(result.exists),
        enabled: Boolean(result.enabled),
        marks: readyMarks(Array.isArray(result.marks) ? result.marks : []),
        shared: false,
        mine: Boolean(result.exists),
        self: false,
        owner: null,
        ownerName: null,
        ...savedCredit(result),
      });
      setEditing(false);
      setDraft(null);
      setSelectedId(null);
      setSpot(null);
      setChordInput("");
      setChordError("");
      return Boolean(result.exists);
    } catch {
      setNote("Não conseguimos guardar a cifra agora.");
      return false;
    } finally {
      setPending(false);
    }
  }

  async function saveTransposed(semitones: number) {
    if (!lyric || !doc || doc.shared || !doc.exists || editing || pending) return false;
    const steps = wrapSemitone(semitones);
    if (steps === 0) return false;
    const marks = transposeMarks(doc.marks, steps).map(storedMark);
    setPending(true);
    setNote("");
    try {
      const result = await send({
        songId: Number(songId),
        title: lyric.title,
        artist: lyric.artist,
        lyricHash: lyricKey(lyric.lyrics),
        marks,
      });
      if (!result) {
        setNote("Não conseguimos guardar a cifra agora.");
        return false;
      }
      setDoc({
        exists: Boolean(result.exists),
        enabled: Boolean(result.enabled),
        marks: readyMarks(Array.isArray(result.marks) ? result.marks : []),
        shared: false,
        mine: Boolean(result.exists),
        self: false,
        owner: null,
        ownerName: null,
        ...savedCredit(result),
      });
      return Boolean(result.exists);
    } catch {
      setNote("Não conseguimos guardar a cifra agora.");
      return false;
    } finally {
      setPending(false);
    }
  }

  async function toggle() {
    if (!doc?.exists || doc.shared || editing || pending) return;
    const enabled = !doc.enabled;
    const previous = doc;
    setDoc({ ...doc, enabled });
    setPending(true);
    setNote("");
    try {
      const result = await send({ songId: Number(songId), enabled });
      if (!result) {
        setDoc(previous);
        setNote(enabled ? "Não conseguimos ligar a cifra agora." : "Não conseguimos desligar a cifra agora.");
        return;
      }
      setDoc({
        exists: true,
        enabled: Boolean(result.enabled),
        marks: readyMarks(Array.isArray(result.marks) ? result.marks : previous.marks),
        shared: false,
        mine: true,
        self: false,
        owner: null,
        ownerName: null,
        creditNickname: previous.creditNickname,
        creditName: previous.creditName,
      });
    } catch {
      setDoc(previous);
      setNote(enabled ? "Não conseguimos ligar a cifra agora." : "Não conseguimos desligar a cifra agora.");
    } finally {
      setPending(false);
    }
  }

  function releaseCipher() {
    setDoc((current) =>
      current
        ? {
            ...current,
            exists: false,
            enabled: false,
            marks: [],
            mine: false,
            creditNickname: null,
            creditName: null,
          }
        : current,
    );
    setEditing(false);
    setDraft(null);
    setSelectedId(null);
    setSpot(null);
    setChordInput("");
    setChordError("");
    setConfirmCopy(false);
  }

  async function rememberSong() {
    if (!lyric) return false;
    const response = await fetch("/api/favorito", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        songId: Number(songId),
        title: lyric.title,
        artist: lyric.artist,
        save: true,
      }),
    });
    const result = (await response.json()) as { ok?: boolean };
    return response.ok && Boolean(result.ok);
  }

  async function copyCipher() {
    if (!lyric || !doc?.shared || doc.self || pending) return false;
    setPending(true);
    setNote("");
    try {
      const saved = await rememberSong();
      if (!saved) {
        setNote("Não conseguimos guardar a música agora.");
        setPending(false);
        return false;
      }
    } catch {
      setNote("Não conseguimos guardar a música agora.");
      setPending(false);
      return false;
    }
    if (!doc.exists || !doc.owner) {
      router.push(`/musica/${songId}`);
      return true;
    }
    if (doc.mine && !confirmCopy) {
      setConfirmCopy(true);
      setNote("Isso substitui a sua cifra desta música. Toque de novo para copiar.");
      setPending(false);
      return true;
    }
    try {
      const result = await send({
        songId: Number(songId),
        copyFrom: doc.owner,
        title: lyric.title,
        artist: lyric.artist,
        lyricHash: lyricKey(lyric.lyrics),
      });
      if (!result) {
        setNote("Não conseguimos copiar a cifra agora.");
        setPending(false);
        return true;
      }
      router.push(`/musica/${songId}`);
      return true;
    } catch {
      setNote("Não conseguimos copiar a cifra agora.");
      setPending(false);
      return true;
    }
  }

  return {
    visible: Boolean(doc),
    shared: Boolean(doc?.shared),
    owner: doc?.owner ?? null,
    ownerName: doc?.ownerName ?? null,
    creditNickname: doc?.creditNickname ?? null,
    creditName: doc?.creditName ?? null,
    mine: Boolean(doc?.mine),
    self: Boolean(doc?.self),
    confirmCopy,
    exists: Boolean(doc?.exists),
    enabled: Boolean(doc?.enabled),
    editing,
    pending,
    stanzas,
    viewMarks,
    drifted: showChords && placement.drifted,
    selected,
    selectedId,
    selectedWord,
    selectedMark,
    spot,
    anchor,
    focusTick,
    chordInput,
    setChordInput: (value: string) => {
      setChordInput(value);
      setChordError("");
      setNote("");
    },
    chordError,
    note,
    startEdit,
    selectWord,
    selectMark,
    moveMark,
    beginAt,
    saveChord,
    clearChord,
    finishEdit,
    saveTransposed,
    toggle,
    copyCipher,
    releaseCipher,
  };
}
