import { api } from "@/lib/http";

export type ChecklistEtapa = {
  id: number;
  centro_custo: string;
  etapa_origem_id: number | null;
  grupo_id?: number | null;
  nome: string;
  ordem: number;
  created_at?: string;
};

export type ChecklistSubetapa = {
  id: string;
  centro_custo: string | null;
  etapa_id: number;
  nome: string;
  setor: string | null;
  responsavel: string | null;
  previsto: number | null;
  avanco: number | null;
  data_inicio: string | null;
  data_termino: string | null;
  observacao: string | null;
  ordem: number;
  created_at?: string;
};

export const checklistMobilizacaoApi = {
  listar: (centroCusto?: string | null) => {
    const params = centroCusto ? `?centro_custo=${encodeURIComponent(centroCusto)}` : "";
    return api.get<{ etapas: ChecklistEtapa[]; subetapas: ChecklistSubetapa[] }>(`/checklist-mobilizacao${params}`);
  },
  criar: (data: Omit<ChecklistSubetapa, "id" | "created_at">) => {
    const params = data.centro_custo ? `?centro_custo=${encodeURIComponent(data.centro_custo)}` : "";
    return api.post<{ id: string }>(`/checklist-mobilizacao${params}`, data);
  },
  atualizar: (id: string, data: Partial<Omit<ChecklistSubetapa, "id" | "created_at">>) =>
    api.patch(`/checklist-mobilizacao/${id}`, data),
  remover: (id: string) => api.delete(`/checklist-mobilizacao/${id}`),
};

export const checklistEtapasApi = {
  criar: (data: Omit<ChecklistEtapa, "id" | "created_at">) => {
    const params = data.centro_custo ? `?centro_custo=${encodeURIComponent(data.centro_custo)}` : "";
    return api.post<{ id: number }>(`/checklist-mobilizacao/etapas${params}`, data);
  },
  atualizar: (id: number, data: Partial<Omit<ChecklistEtapa, "id" | "created_at">>) =>
    api.patch(`/checklist-mobilizacao/etapas/${id}`, data),
  remover: (id: number) => api.delete(`/checklist-mobilizacao/etapas/${id}`),
  reordenar: (etapas: Array<{ id: number; ordem: number }>) =>
    api.put("/checklist-mobilizacao/etapas/reordenar", { etapas }),
};
