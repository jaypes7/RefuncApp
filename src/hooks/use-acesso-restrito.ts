"use client";

import { useQuery } from "@tanstack/react-query";
import { colaboradoresRestritosApi } from "@/lib/axios";

/**
 * Hook que verifica se o usuário logado possui acesso à área restrita.
 * Consulta GET /api/auth/restrito e cacheia por 5 minutos.
 */
export function useAcessoRestrito() {
  return useQuery({
    queryKey: ["acesso-restrito"],
    queryFn: async () => {
      const response = await colaboradoresRestritosApi.verificarAcesso();
      return response.data.hasAccess;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: false,
  });
}
