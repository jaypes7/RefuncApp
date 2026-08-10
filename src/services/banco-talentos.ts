import { api } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";

export interface BancoTalento {
  id: string;
  pessoa?: string | null;
  nome: string;
  idade?: number | null;
  dt_nasc?: string | null;
  cpf?: string | null;
  municipio?: string | null;
  uf?: string | null;
  telefone?: string | null;
  created_at?: string | null;
}

export interface ListarBancoTalentosParams {
  page?: number;
  limit?: number;
  search?: string;
  pessoa?: string;
  cpf?: string;
  municipio?: string;
}

export const bancoTalentosApi = {
  listar: (params?: ListarBancoTalentosParams) =>
    api.get<PaginatedResponse<BancoTalento>>("/banco-talentos", { params }),

  criar: (talento: Omit<BancoTalento, "id" | "created_at">) =>
    api.post<{ data: BancoTalento }>("/banco-talentos", talento),

  atualizar: (id: string, talento: Partial<Omit<BancoTalento, "id" | "created_at">>) =>
    api.put<{ data: BancoTalento }>(`/banco-talentos/${id}`, talento),

  remover: (id: string) => api.delete(`/banco-talentos/${id}`),

  importar: (body: { rows: Record<string, unknown>[] }) =>
    api.post("/banco-talentos/import", body),

  realocar: (body: { id: string; novo_centro_custo: string }) =>
    api.post("/banco-talentos/realocar", body),
};
