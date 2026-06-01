"use client";

import { FlaskConical } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber-400 px-4 py-2 text-sm font-medium text-amber-950 shadow-sm dark:bg-amber-600 dark:text-amber-50">
      <FlaskConical className="h-4 w-4 shrink-0" />
      <span>
        Ambiente de demonstração — todos os dados são fictícios e não são
        persistidos.
      </span>
    </div>
  );
}
