"use client";

import { Button } from "@/components/ui/button";
import { type ContrastMode, usePrefs } from "@/components/preferences";
import { cn } from "@/lib/utils";
import Link from "next/link";

export const bigButtonClass =
  "h-auto min-h-16 w-full touch-manipulation rounded-2xl border-[3px] border-foreground px-4 py-3 text-center text-xl font-bold leading-tight focus-visible:ring-4";

const contrastOptions: { id: ContrastMode; label: string }[] = [
  { id: "padrao", label: "Clara" },
  { id: "preto", label: "Preto no branco" },
  { id: "branco", label: "Branco no preto" },
];

export function BackLink() {
  return (
    <Button
      nativeButton={false}
      render={<Link href="/" />}
      size="grande"
      className={cn(bigButtonClass, "text-2xl")}
    >
      Voltar
    </Button>
  );
}

export function ContrastControl({ compact = false }: { compact?: boolean }) {
  const { contrast, setContrast } = usePrefs();
  const index = Math.max(0, contrastOptions.findIndex((option) => option.id === contrast));
  const current = contrastOptions[index] ?? contrastOptions[0];

  function cycle() {
    const next = contrastOptions[(index + 1) % contrastOptions.length];
    if (next) setContrast(next.id);
  }

  const choices = (
    <div role="group" aria-label="Contraste da tela" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {contrastOptions.map((option) => {
        const selected = contrast === option.id;
        return (
          <Button
            key={option.id}
            type="button"
            size="grande"
            variant={selected ? "default" : "outline"}
            aria-pressed={selected}
            className={bigButtonClass}
            onClick={() => setContrast(option.id)}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );

  if (!compact) {
    return (
      <div>
        <p className="mb-2 text-xl font-bold">Contraste da tela</p>
        {choices}
      </div>
    );
  }

  return (
    <div>
      <div className="sm:hidden">
        <Button
          type="button"
          size="grande"
          variant={contrast === "padrao" ? "outline" : "default"}
          className={bigButtonClass}
          aria-label={`Contraste atual: ${current.label}. Toque para mudar.`}
          onClick={cycle}
        >
          {current.label}
        </Button>
      </div>
      <div className="hidden sm:block">{choices}</div>
    </div>
  );
}
