"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const bigButtonClass =
  "h-auto min-h-16 w-full touch-manipulation rounded-2xl border-[3px] border-foreground px-4 py-3 text-center text-xl font-bold leading-tight focus-visible:ring-4";

export const compactButtonClass =
  "size-12 min-h-12 min-w-12 touch-manipulation rounded-xl border-2 border-foreground bg-background p-0 text-lg font-bold text-foreground shadow-none focus-visible:ring-4";

export function BackLink() {
  return (
    <Button
      nativeButton={false}
      render={<Link href="/" />}
      variant="outline"
      size="icon"
      aria-label="Voltar"
      className={cn(compactButtonClass)}
    >
      <ArrowLeft className="size-6" aria-hidden="true" />
    </Button>
  );
}
