/**
 * ============================================================================
 * HOOK: useCargos
 * ============================================================================
 *
 * Busca cargos dinamicamente do banco de dados (`/api/config/cargos`)
 * e deriva listas planas e agrupadas para consumo nos componentes.
 *
 * Substitui o uso do arquivo legado `src/constants/cargos.ts`.
 */

import { useQuery } from "@tanstack/react-query";

type CargoDB = {
  id: string;
  nome: string;
  grupo: string | null;
  ativo: boolean;
};

type UseCargosReturn = {
  /** Lista plana de todos os nomes de cargos (ativo ou não) */
  cargos: string[];
  /** Mapa de grupo -> array de cargos pertencentes ao grupo */
  cargosAgrupados: Record<string, string[]>;
  /** Lista dos nomes dos grupos únicos */
  grupos: string[];
  /** Dados brutos do banco */
  data: CargoDB[] | undefined;
  /** Estado de carregamento */
  isLoading: boolean;
  /** Estado de erro */
  isError: boolean;
  /** Objeto de erro, se houver */
  error: Error | null;
};

export function useCargos(): UseCargosReturn {
  const { data, isLoading, isError, error } = useQuery<CargoDB[]>({
    queryKey: ["config", "cargos"],
    queryFn: async () => {
      const res = await fetch("/api/config/cargos");
      if (!res.ok) throw new Error("Falha ao carregar cargos");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const lista = data ?? [];

  // Deriva lista plana de nomes
  const cargos = lista.map((c) => c.nome);

  // Deriva mapa de grupos
  const cargosAgrupados: Record<string, string[]> = {};
  for (const cargo of lista) {
    if (cargo.grupo) {
      if (!cargosAgrupados[cargo.grupo]) {
        cargosAgrupados[cargo.grupo] = [];
      }
      cargosAgrupados[cargo.grupo].push(cargo.nome);
    }
  }

  // Deriva lista de grupos únicos (ordenada)
  const grupos = Object.keys(cargosAgrupados).sort();

  return {
    cargos,
    cargosAgrupados,
    grupos,
    data,
    isLoading,
    isError,
    error: error instanceof Error ? error : null,
  };
}
