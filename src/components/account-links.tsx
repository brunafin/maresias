"use client";

import { sair } from "@/app/entrar/actions";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState } from "react";

const quietClass =
  "inline-flex min-h-11 items-center text-lg font-normal text-foreground/80 underline-offset-4 hover:underline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-foreground";

const menuActionClass =
  "flex min-h-16 w-full items-center justify-center rounded-2xl border-[3px] border-foreground px-4 text-2xl font-bold text-foreground no-underline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-foreground";

export function AppRevision({ className }: { className?: string }) {
  const revision = process.env.NEXT_PUBLIC_APP_REVISION?.trim() ?? "";
  if (!revision) return null;
  return <p className={className}>Atualizado em {revision}</p>;
}

export function AccountLinks({ signedIn, firstName }: { signedIn: boolean; firstName: string | null }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!signedIn) {
    return (
      <div className="flex justify-end">
        <Link href="/entrar" className={quietClass}>
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label="Abrir o menu"
        className="inline-flex size-12 items-center justify-center rounded-xl text-foreground focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-foreground"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-6" aria-hidden="true" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-40">
          <button type="button" aria-label="Fechar o menu" className="absolute inset-0 bg-foreground/45" onClick={() => setOpen(false)} />
          <div
            id={menuId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="absolute inset-y-0 right-0 flex w-full flex-col bg-background px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:max-w-sm sm:border-l-[3px] sm:border-foreground"
          >
            <div className="flex items-center gap-3">
              <p id={titleId} className="min-w-0 flex-1 truncate text-3xl font-bold leading-tight">
                {firstName ?? "Conta"}
              </p>
              <button
                type="button"
                aria-label="Fechar o menu"
                className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl text-foreground focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-foreground"
                onClick={() => setOpen(false)}
              >
                <X className="size-6" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-8 flex flex-col gap-4">
              <Link href="/favoritas" className={menuActionClass} onClick={() => setOpen(false)}>
                Favoritas
              </Link>
              <form action={sair}>
                <Button type="submit" variant="outline" size="grande" className="h-auto min-h-16 w-full rounded-2xl border-[3px] border-foreground text-2xl font-bold">
                  Sair
                </Button>
              </form>
            </div>
            <AppRevision className="mt-auto pt-6 text-sm leading-snug text-foreground/70" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
