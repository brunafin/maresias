"use client";

import { bigButtonClass } from "@/components/controls";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SongFilterValue = "todas" | "cifradas";

export function SongFilter({
  value,
  onChange,
}: {
  value: SongFilterValue;
  onChange: (value: SongFilterValue) => void;
}) {
  return (
    <div role="group" aria-label="Filtro das músicas" className="grid grid-cols-2 gap-3">
      <Button
        type="button"
        variant="outline"
        aria-pressed={value === "todas"}
        className={cn(bigButtonClass, value === "todas" && "bg-foreground text-background hover:bg-foreground hover:text-background")}
        onClick={() => onChange("todas")}
      >
        Todas
      </Button>
      <Button
        type="button"
        variant="outline"
        aria-pressed={value === "cifradas"}
        className={cn(
          bigButtonClass,
          value === "cifradas" && "bg-foreground text-background hover:bg-foreground hover:text-background",
        )}
        onClick={() => onChange("cifradas")}
      >
        Cifradas
      </Button>
    </div>
  );
}
