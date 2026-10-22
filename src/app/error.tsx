"use client";

import { Button } from "@/components/ui/button";
import { bigButtonClass } from "@/components/controls";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex h-full w-full max-w-3xl flex-col justify-center gap-6 px-5">
      <h1 className="text-4xl font-bold leading-tight">Algo deu errado nesta página.</h1>
      <Button type="button" size="grande" className={bigButtonClass} onClick={() => reset()}>
        Tentar de novo
      </Button>
    </main>
  );
}
