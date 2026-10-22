"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";

export const LYRIC_SIZES = [28, 32, 40, 48, 56, 64, 72, 80] as const;
export const DEFAULT_LYRIC_SIZE = 40;

const SIZE_KEY = "letras-da-roda-tamanho";
const CONTRAST_KEY = "letras-da-roda-contraste";

export type ContrastMode = "padrao" | "preto" | "branco";

type Prefs = {
  size: number;
  contrast: ContrastMode;
  setSize: (size: number) => void;
  setContrast: (contrast: ContrastMode) => void;
};

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function isSize(value: number): value is (typeof LYRIC_SIZES)[number] {
  return (LYRIC_SIZES as readonly number[]).includes(value);
}

function readSize(): number {
  try {
    const raw = Number(localStorage.getItem(SIZE_KEY));
    if (isSize(raw)) return raw;
  } catch {
    // Storage can be blocked. The default size still works.
  }
  return DEFAULT_LYRIC_SIZE;
}

function readContrast(): ContrastMode {
  try {
    const raw = localStorage.getItem(CONTRAST_KEY);
    if (raw === "preto" || raw === "branco" || raw === "padrao") return raw;
  } catch {
    // Storage can be blocked. The warm page still works.
  }
  return "padrao";
}

function serverSize() {
  return DEFAULT_LYRIC_SIZE;
}

function serverContrast(): ContrastMode {
  return "padrao";
}

const PrefsContext = createContext<Prefs | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const size = useSyncExternalStore(subscribe, readSize, serverSize);
  const contrast = useSyncExternalStore(subscribe, readContrast, serverContrast);

  useEffect(() => {
    document.documentElement.dataset.contrast = readContrast();
    document.documentElement.style.setProperty("--lyric-size", `${readSize()}px`);
  }, [size, contrast]);

  const prefs: Prefs = {
    size,
    contrast,
    setSize(next) {
      try {
        localStorage.setItem(SIZE_KEY, String(next));
      } catch {
        // Ignore quota and private-mode errors.
      }
      document.documentElement.style.setProperty("--lyric-size", `${next}px`);
      emit();
    },
    setContrast(next) {
      try {
        localStorage.setItem(CONTRAST_KEY, next);
      } catch {
        // Ignore quota and private-mode errors.
      }
      document.documentElement.dataset.contrast = next;
      emit();
    },
  };

  return (
    <PrefsContext.Provider value={prefs}>
      <div className="h-full min-h-0">{children}</div>
    </PrefsContext.Provider>
  );
}

export function usePrefs(): Prefs {
  const value = useContext(PrefsContext);
  if (!value) {
    throw new Error("Preferências ainda não estão prontas.");
  }
  return value;
}
