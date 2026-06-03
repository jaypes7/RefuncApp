"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { CardTvCarousel } from "@/components/tv/CardTvCarousel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Tv, CheckSquare, Square } from "lucide-react";

// ============================================================================
// TIPOS
// ============================================================================

interface Projeto {
  centro_custo: string;
  nome_cliente: string | null;
}

// ============================================================================
// MODAL DE SELEÇÃO DE PROJETOS
// ============================================================================

interface ProjectSelectorModalProps {
  projetos: Projeto[];
  isLoading: boolean;
  initialSelected?: string[];
  onConfirm: (selected: string[]) => void;
}

function ProjectSelectorModal({
  projetos,
  isLoading,
  initialSelected,
  onConfirm,
}: ProjectSelectorModalProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelected ?? []),
  );
  const [search, setSearch] = useState("");

  const filtered = projetos.filter(
    (p) =>
      !search ||
      p.centro_custo.toLowerCase().includes(search.toLowerCase()) ||
      (p.nome_cliente ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((p) => selected.has(p.centro_custo));

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((p) => next.delete(p.centro_custo));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((p) => next.add(p.centro_custo));
        return next;
      });
    }
  };

  const toggle = (cc: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cc)) next.delete(cc);
      else next.add(cc);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-border shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Tv className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Modo TV — Seleção de Projetos</h2>
            <p className="text-xs text-muted-foreground">
              Escolha quais projetos serão exibidos no carrossel
            </p>
          </div>
        </div>

        {/* Busca */}
        <div className="p-4 pb-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9"
              placeholder="Filtrar por centro de custo ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* Selecionar todos */}
        <div className="px-4 pb-2 shrink-0">
          <button
            type="button"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-1.5 px-2 rounded-md hover:bg-muted/50"
            onClick={toggleAll}
          >
            {allFilteredSelected ? (
              <CheckSquare className="h-4 w-4 text-primary shrink-0" />
            ) : (
              <Square className="h-4 w-4 shrink-0" />
            )}
            <span className="font-medium">
              {allFilteredSelected ? "Desmarcar todos" : "Selecionar todos"}
            </span>
            {selected.size > 0 && (
              <span className="ml-auto text-xs font-medium text-primary">
                {selected.size} selecionado{selected.size !== 1 ? "s" : ""}
              </span>
            )}
          </button>
        </div>

        <div className="h-px bg-border mx-4 shrink-0" />

        {/* Lista de projetos */}
        <div className="flex-1 overflow-y-auto p-4 pt-2 space-y-1 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum projeto encontrado
            </p>
          ) : (
            filtered.map((p) => {
              const isChecked = selected.has(p.centro_custo);
              return (
                <button
                  key={p.centro_custo}
                  type="button"
                  onClick={() => toggle(p.centro_custo)}
                  className={`flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/50 border ${
                    isChecked
                      ? "bg-primary/10 border-primary/20"
                      : "border-transparent"
                  }`}
                >
                  {isChecked ? (
                    <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {p.centro_custo}
                    </p>
                    {p.nome_cliente && (
                      <p className="text-xs text-muted-foreground truncate">
                        {p.nome_cliente}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Rodapé */}
        <div className="p-4 border-t border-border flex items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-muted-foreground">
            {selected.size === 0
              ? "Selecione ao menos um projeto"
              : `${selected.size} projeto${selected.size !== 1 ? "s" : ""} selecionado${selected.size !== 1 ? "s" : ""}`}
          </p>
          <Button
            disabled={selected.size === 0}
            onClick={() => onConfirm([...selected])}
            className="gap-2"
          >
            <Tv className="h-4 w-4" />
            Iniciar TV
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CONTEÚDO PRINCIPAL
// ============================================================================

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

  const [modalOpen, setModalOpen] = useState(true);
  const [confirmedProjetos, setConfirmedProjetos] = useState<string[] | null>(null);

  const { data: allProjetosData = [], isLoading } = useQuery<Projeto[]>({
    queryKey: ["projetos", "modal", "cardtv"],
    queryFn: async () => {
      const res = await fetch("/api/projetos");
      if (!res.ok) return [];
      const json = (await res.json()) as { data?: Projeto[] };
      return json.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const projetos = confirmedProjetos ?? [];

  if (modalOpen) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <ProjectSelectorModal
          projetos={allProjetosData}
          isLoading={isLoading}
          initialSelected={projetosParam}
          onConfirm={(selected) => {
            setConfirmedProjetos(selected);
            setModalOpen(false);
          }}
        />
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

// ============================================================================
// PÁGINA
// ============================================================================

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
