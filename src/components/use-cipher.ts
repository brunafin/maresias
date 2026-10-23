"use client";

import {
  lyricKey,
  lyricLines,
  normalizeChord,
  placeMarks,
  wordKey,
  type CipherMark,
  type LyricWord,
} from "@/lib/cipher-marks";
import { lyricStanzas } from "@/lib/clean-lyrics";
import { useEffect, useMemo, useState } from "react";

type Lyric = { title: string; artist: string; lyrics: string };

type Doc = {
  exists: boolean;
  enabled: boolean;
  marks: CipherMark[];
};

type SaveResult = {
  ok?: boolean;
  exists?: boolean;
  enabled?: boolean;
  marks?: CipherMark[];
};

export function useCipher(songId: string, lyric: Lyric | null) {
  const invalid = !/^\d+$/.test(songId);
  const [seenId, setSeenId] = useState(songId);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CipherMark[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [focusTick, setFocusTick] = useState(0);
  const [chordInput, setChordInput] = useState("");
  const [chordError, setChordError] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);

  if (seenId !== songId) {
    setSeenId(songId);
    setDoc(null);
    setEditing(false);
    setDraft(null);
    setSelected(null);
    setChordInput("");
    setChordError("");
    setNote("");
    setPending(false);
  }

  useEffect(() => {
    if (invalid) return;
    const controller = new AbortController();
    let cancelled = false;
    const timer = window.setTimeout(() => controller.abort(), 8000);
    fetch(`/api/cifra?id=${songId}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as SaveResult & { showCipher?: boolean; signedIn?: boolean };
        if (cancelled || !response.ok || !body.ok || !body.showCipher || !body.signedIn) return;
        setDoc({
          exists: Boolean(body.exists),
          enabled: Boolean(body.enabled),
          marks: Array.isArray(body.marks) ? body.marks : [],
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
  }, [songId, invalid]);

  const stanzas = useMemo(() => (lyric ? lyricStanzas(lyric.lyrics) : []), [lyric]);
  const placement = useMemo(
    () => placeMarks(stanzas, editing ? (draft ?? []) : (doc?.marks ?? [])),
    [stanzas, editing, draft, doc?.marks],
  );
  const showChords = editing || Boolean(doc?.enabled);
  const viewMarks = showChords ? placement.placed : [];

  const selectedWord = useMemo(() => {
    if (!selected) return null;
    for (const stanza of lyricLines(stanzas)) {
      for (const line of stanza) {
        for (const word of line) {
          if (wordKey(word) === selected) return word;
        }
      }
    }
    return null;
  }, [selected, stanzas]);

  const selectedMark = selected ? (viewMarks.find((mark) => wordKey(mark) === selected) ?? null) : null;

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
    if (!lyric || !doc) return;
    const next = placeMarks(stanzas, doc.marks);
    setDraft([...next.placed, ...next.loose]);
    setEditing(true);
    setSelected(null);
    setChordInput("");
    setChordError("");
    setNote("");
  }

  function selectWord(word: LyricWord, focus: boolean) {
    const key = wordKey(word);
    if (key !== selected) {
      const mark = (draft ?? doc?.marks ?? []).find((item) => wordKey(item) === key);
      setSelected(key);
      setChordInput(mark?.chord ?? "");
      setChordError("");
      setNote("");
    }
    if (focus) setFocusTick((value) => value + 1);
  }

  function setGap(key: string, gap: number) {
    setDraft((current) => {
      if (!current) return current;
      return current.map((mark) => (wordKey(mark) === key ? { ...mark, gap } : mark));
    });
  }

  function saveChord() {
    if (!selectedWord) return;
    const chord = normalizeChord(chordInput);
    if (!chord) {
      setNote("");
      setChordError("Use o acorde assim: Am, G7, F#m.");
      return;
    }
    const key = wordKey(selectedWord);
    setDraft((current) => {
      const list = current ?? [];
      const previous = list.find((mark) => wordKey(mark) === key);
      const next = list.filter((mark) => wordKey(mark) !== key);
      next.push({
        stanza: selectedWord.stanza,
        line: selectedWord.line,
        word: selectedWord.word,
        gap: previous?.gap ?? 0,
        wordText: selectedWord.text,
        chord,
      });
      return next;
    });
    setChordInput(chord);
    setChordError("");
    setNote("Salvo.");
  }

  function clearChord() {
    if (!selected) return;
    setDraft((current) => (current ?? []).filter((mark) => wordKey(mark) !== selected));
    setChordInput("");
    setChordError("");
    setNote("Apagado.");
  }

  async function finishEdit() {
    if (!lyric || pending) return;
    const next = placeMarks(stanzas, draft ?? []);
    const marks = [...next.placed, ...next.loose];
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
        return;
      }
      setDoc({
        exists: Boolean(result.exists),
        enabled: Boolean(result.enabled),
        marks: Array.isArray(result.marks) ? result.marks : [],
      });
      setEditing(false);
      setDraft(null);
      setSelected(null);
      setChordInput("");
      setChordError("");
    } catch {
      setNote("Não conseguimos guardar a cifra agora.");
    } finally {
      setPending(false);
    }
  }

  async function toggle() {
    if (!doc?.exists || editing || pending) return;
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
        marks: Array.isArray(result.marks) ? result.marks : previous.marks,
      });
    } catch {
      setDoc(previous);
      setNote(enabled ? "Não conseguimos ligar a cifra agora." : "Não conseguimos desligar a cifra agora.");
    } finally {
      setPending(false);
    }
  }

  return {
    visible: Boolean(doc),
    exists: Boolean(doc?.exists),
    enabled: Boolean(doc?.enabled),
    editing,
    pending,
    stanzas,
    viewMarks,
    drifted: showChords && placement.drifted,
    selected,
    selectedWord,
    selectedMark,
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
    setGap,
    saveChord,
    clearChord,
    finishEdit,
    toggle,
  };
}
