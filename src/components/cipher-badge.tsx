import { Guitar } from "lucide-react";

export function CipherBadge() {
  return (
    <span className="shrink-0 text-foreground" title="Com cifra">
      <Guitar className="size-6" strokeWidth={2.25} aria-hidden="true" />
      <span className="sr-only">Com cifra</span>
    </span>
  );
}
