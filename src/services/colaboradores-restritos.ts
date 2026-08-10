import { api } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";

export interface ColaboradorRestrito {
  id: string;
  nome: string;
  cpf?: string | null;
  tipo_demissao?: string | null;
  motivo_demissao?: string | null;
  created_at?: string | null;
}

export interface ListarColaboradoresRestritosParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const colaboradoresRestritosApi = {
  listar: (params?: ListarColaboradoresRestritosParams) =>
    api.get<PaginatedResponse<ColaboradorRestrito>>("/colaboradores-restritos", { params }),

  criar: (body: Omit<ColaboradorRestrito, "id" | "created_at">) =>
    api.post<{ data: ColaboradorRestrito }>("/colaboradores-restritos", body),

  atualizar: (id: string, body: Partial<Omit<ColaboradorRestrito, "id" | "created_at">>) =>
    api.put<{ data: ColaboradorRestrito }>(`/colaboradores-restritos/${id}`, body),

  remover: (id: string) => api.delete(`/colaboradores-restritos/${id}`),

  verificarAcesso: () => api.get<{ hasAccess: boolean }>("/auth/restrito"),

  importar: (body: { rows: Record<string, unknown>[] }) =>
    api.post<{
      inseridos: number;
      atualizados: number;
      ignorados: number;
      erros: Array<{ linha: number; motivo: string }>;
      total: number;
    }>("/colaboradores-restritos/import", body),
};
