"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";

export const LYRIC_SIZES = [16, 20, 24, 28, 32, 40, 48, 56, 64, 72, 80] as const;
export const DEFAULT_LYRIC_SIZE = 40;

const SIZE_KEY = "letras-da-roda-tamanho";

type Prefs = {
  size: number;
  setSize: (size: number) => void;
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

function serverSize() {
  return DEFAULT_LYRIC_SIZE;
}

const PrefsContext = createContext<Prefs | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const size = useSyncExternalStore(subscribe, readSize, serverSize);

  useEffect(() => {
    document.documentElement.removeAttribute("data-contrast");
    document.documentElement.style.setProperty("--lyric-size", `${readSize()}px`);
  }, [size]);

  const prefs: Prefs = {
    size,
    setSize(next) {
      try {
        localStorage.setItem(SIZE_KEY, String(next));
      } catch {
        // Ignore quota and private-mode errors.
      }
      document.documentElement.style.setProperty("--lyric-size", `${next}px`);
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
