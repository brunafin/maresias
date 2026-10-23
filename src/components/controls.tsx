"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

export const bigButtonClass =
  "h-auto min-h-16 w-full touch-manipulation rounded-2xl border-[3px] border-foreground px-4 py-3 text-center text-xl font-bold leading-tight focus-visible:ring-4";

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
