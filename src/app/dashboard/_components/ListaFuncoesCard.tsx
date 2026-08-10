"use client";

import { useMemo, useState } from "react";
import { CalendarClock, ChevronDown, ChevronUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Colaborador } from "@/lib/axios";

export function ListaFuncoesCard({ colaboradores }: { colaboradores: Colaborador[] }) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [filterNome, setFilterNome] = useState("");

  const toggleGroup = (funcao: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(funcao)) next.delete(funcao);
      else next.add(funcao);
      return next;
    });
  };

  // Agrupada por FUNCAO_CLT (todos os colaboradores)
  const funcoesAgrupado = useMemo(() => {
    if (colaboradores.length === 0) return [];
    const filtrada = filterNome
      ? colaboradores.filter((row) => row.NOME?.toLowerCase().includes(filterNome.toLowerCase()))
      : colaboradores;
    const grupos = new Map<string, Colaborador[]>();
    for (const row of filtrada) {
      const fn = row.FUNCAO_CLT ?? "Não informado";
      if (!grupos.has(fn)) grupos.set(fn, []);
      grupos.get(fn)!.push(row);
    }
    return Array.from(grupos.entries()).map(([funcao, membros]) => ({ funcao, membros }));
  }, [colaboradores, filterNome]);

  return (
    <Card data-cardtv-id="geral-lista-funcoes" className="glass-card h-[480px] 2xl:h-[520px]">
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <CalendarClock className="h-4 w-4 text-primary" />
        <CardTitle>Lista de Funções</CardTitle>
        <span className="text-sm font-normal text-muted-foreground">
          ({funcoesAgrupado.reduce((acc, g) => acc + g.membros.length, 0)} colaboradores)
        </span>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 overflow-hidden">
        <Input
          placeholder="Pesquisa avançada"
          value={filterNome}
          onChange={(e) => setFilterNome(e.target.value)}
          className="mb-3 h-8 text-sm"
        />
        {/* Lista agrupada por função com scroll fixo */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-2">
          {funcoesAgrupado.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum colaborador encontrado.
            </p>
          ) : (
            funcoesAgrupado.map(({ funcao, membros }) => {
              const isOpen = expandedGroups.has(funcao);
              return (
                <div key={funcao} className="rounded-lg border border-white/5 bg-white/5">
                  <button
                    type="button"
                    onClick={() => toggleGroup(funcao)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left"
                  >
                    <span className="text-xs font-bold uppercase tracking-wider text-black">
                      {funcao}
                      <span className="ml-2 font-bold normal-case">({membros.length})</span>
                    </span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="space-y-1 px-3 pb-2">
                      {membros.map((m, i) => (
                        <div
                          key={`${m.NOME}-${i}`}
                          className="flex items-center justify-between rounded-md px-3 py-2 border border-white/5 bg-white/5"
                        >
                          <span className="text-sm 2xl:text-base font-medium truncate max-w-[60%]" title={m.NOME}>
                            {m.NOME}
                          </span>
                          <span className="text-xs 2xl:text-sm font-bold tabular-nums text-muted-foreground">
                            {m.FUNCAO_CLT ?? "Não informado"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
