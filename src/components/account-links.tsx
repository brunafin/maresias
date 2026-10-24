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

export function AccountLinks({
  signedIn,
  firstName,
  nickname,
}: {
  signedIn: boolean;
  firstName: string | null;
  nickname: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
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
      <div className="ml-auto shrink-0">
        <Link href="/entrar" className={quietClass}>
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <>
      {nickname ? (
        <span className="min-w-0 truncate text-xl font-bold leading-tight text-[#1b4f8a]">({nickname})</span>
      ) : null}
      <div className="ml-auto shrink-0">
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
              {nickname ? (
                <button
                  type="button"
                  className="mt-3 w-fit text-left text-xl leading-snug text-foreground/80 underline-offset-4 hover:underline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-foreground"
                  aria-label={copied ? "Apelido copiado" : `Copiar o apelido ${nickname}`}
                  onClick={() => {
                    void navigator.clipboard.writeText(nickname).then(
                      () => {
                        setCopied(true);
                        window.setTimeout(() => setCopied(false), 2000);
                      },
                      () => undefined,
                    );
                  }}
                >
                  {copied ? "Apelido copiado" : `Apelido ${nickname}`}
                </button>
              ) : null}
              <div className="mt-8 flex flex-col gap-4">
                <Link href="/favoritas" className={menuActionClass} onClick={() => setOpen(false)}>
                  Favoritas
                </Link>
                <Link href="/amigos" className={menuActionClass} onClick={() => setOpen(false)}>
                  Amigos
                </Link>
                <form action={sair}>
                  <Button type="submit" variant="outline" size="grande" className="h-auto min-h-16 w-full rounded-2xl border-[3px] border-foreground text-2xl font-bold">
                    Sair
                  </Button>
                </form>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
