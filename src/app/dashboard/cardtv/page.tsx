"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { CardTvCarousel } from "@/components/tv/CardTvCarousel";

function CardTvContent() {
  const params = useSearchParams();
  const { setTheme, theme } = useTheme();
  const prevThemeRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    prevThemeRef.current = theme;
    setTheme("light");
    return () => {
      if (prevThemeRef.current) setTheme(prevThemeRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const projetosParam = params.get("projetos")?.split(",").filter(Boolean);
  const tempo = Number(params.get("tempo")) || 10;
  const dashboards = params.get("dashboards")?.split(",").filter(Boolean);

  const hasProjetosParam = projetosParam && projetosParam.length > 0;

  const { data: allProjetos = [], isLoading } = useQuery<string[]>({
    queryKey: ["projetos", "centros", "cardtv"],
    queryFn: async () => {
      const res = await fetch("/api/projetos");
      if (!res.ok) return [];
      const json = (await res.json()) as { data?: Array<{ centro_custo: string }> };
      return (json.data || []).map((p) => p.centro_custo).filter(Boolean).sort();
    },
    enabled: !hasProjetosParam,
    staleTime: 5 * 60 * 1000,
  });

  const projetos = hasProjetosParam ? projetosParam : allProjetos;

  if (isLoading && projetos.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#ff460a] border-t-transparent" />
          <p className="text-sm text-muted-foreground">Carregando projetos...</p>
        </div>
      </div>
    );
  }

  if (projetos.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="max-w-md text-center space-y-4">
          <div className="h-1 w-16 mx-auto rounded-full bg-[#ff460a]" />
          <h1 className="text-xl font-semibold text-foreground">Modo TV — Card por Card</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Nenhum projeto encontrado no sistema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <CardTvCarousel
      projetos={projetos}
      intervalSec={tempo}
      dashboards={dashboards}
    />
  );
}

export default function CardTvPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#ff460a] border-t-transparent" />
        </div>
      }
    >
      <CardTvContent />
    </Suspense>
  );
}
