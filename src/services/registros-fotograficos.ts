import { api } from "@/lib/http";

export interface RegistroFotografico {
  id: string;
  nome: string;
  descricao?: string | null;
  centro_custo: string;
  urls: string[];
  created_at: string;
  created_by?: string | null;
}

export const registrosFotograficosApi = {
  listar: (centroCusto?: string | null) => {
    const params = centroCusto ? `?centro_custo=${encodeURIComponent(centroCusto)}` : "";
    return api.get<{ data: RegistroFotografico[] }>(`/registros-fotograficos${params}`);
  },

  criar: (formData: FormData) =>
    api.post<{ data: RegistroFotografico }>("/registros-fotograficos", formData, {
      headers: { "Content-Type": undefined },
    }),

  atualizar: (id: string, body: { nome: string; descricao?: string | null }) =>
    api.put<{ data: RegistroFotografico }>(`/registros-fotograficos/${id}`, body),

  atualizarComFotos: (id: string, formData: FormData) =>
    api.put<{ data: RegistroFotografico }>(`/registros-fotograficos/${id}`, formData, {
      headers: { "Content-Type": undefined },
    }),

  remover: (id: string) => api.delete(`/registros-fotograficos/${id}`),
};
