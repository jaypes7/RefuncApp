"use client";

import { useQuery } from "@tanstack/react-query";
import { useFilter } from "@/contexts/FilterContext";

export type ProjetoResumo = {
  centro_custo: string;
  nome_cliente: string | null;
  data_inicio_projeto: string | null;
  data_fim_projeto: string | null;
};

export const ROLES = [
  { value: "admin", label: "Administrador" },
  { value: "user", label: "Usuário" },
  { value: "guest", label: "Convidado" },
];

/** Lista de projetos (centros de custo) — compartilhada entre as abas; o React Query deduplica. */
export function useProjetos() {
  const { isReady: filterReady } = useFilter();
  return useQuery<ProjetoResumo[]>({
    queryKey: ["projetos"],
    queryFn: async () => {
      const res = await fetch("/api/projetos");
      if (!res.ok) throw new Error("Falha ao carregar projetos");
      const json = await res.json();
      return json.data as ProjetoResumo[];
    },
    enabled: filterReady,
  });
}
