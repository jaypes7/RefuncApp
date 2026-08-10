import { api } from "@/lib/http";

// Ocorrências, pendências manuais e comentários do cliente (anotações do dashboard)

export interface Ocorrencia {
  id: number;
  texto: string;
  /** ISO date string YYYY-MM-DD */
  data: string;
  created_at: string;
  centro_custo?: string;
}

export const ocorrenciasApi = {
  listar: (centroCusto?: string | null) => {
    const params = centroCusto ? `?centro_custo=${encodeURIComponent(centroCusto)}` : "";
    return api.get<{ data: Ocorrencia[] }>(`/ocorrencias${params}`);
  },

  criar: (body: { texto: string; data: string; centro_custo?: string }) =>
    api.post<{ data: Ocorrencia }>("/ocorrencias", body),

  atualizar: (id: number, body: { texto: string; data: string; centro_custo?: string }) =>
    api.put<{ data: Ocorrencia }>(`/ocorrencias/${id}`, body),

  deletar: (id: number) => api.delete(`/ocorrencias/${id}`),
};

export interface PendenciaManual {
  id: number;
  texto: string;
  created_at: string;
  centro_custo?: string;
}

export const pendenciasApi = {
  listar: (centroCusto?: string | null) => {
    const params = centroCusto ? `?centro_custo=${encodeURIComponent(centroCusto)}` : "";
    return api.get<{ data: PendenciaManual[] }>(`/pendencias${params}`);
  },

  criar: (body: { texto: string; centro_custo?: string }) =>
    api.post<{ data: PendenciaManual }>("/pendencias", body),

  atualizar: (id: number, body: { texto: string; centro_custo?: string }) =>
    api.put<{ data: PendenciaManual }>(`/pendencias/${id}`, body),

  deletar: (id: number) => api.delete(`/pendencias/${id}`),
};

export interface ComentarioCliente {
  id: number;
  texto: string;
  /** ISO date string YYYY-MM-DD */
  data: string;
  created_at: string;
  centro_custo?: string;
}

export const comentariosClienteApi = {
  listar: (centroCusto?: string | null) => {
    const params = centroCusto ? `?centro_custo=${encodeURIComponent(centroCusto)}` : "";
    return api.get<{ data: ComentarioCliente[] }>(`/comentarios-cliente${params}`);
  },

  criar: (body: { texto: string; data: string; centro_custo?: string }) =>
    api.post<{ data: ComentarioCliente }>("/comentarios-cliente", body),

  atualizar: (id: number, body: { texto: string; data: string; centro_custo?: string }) =>
    api.put<{ data: ComentarioCliente }>(`/comentarios-cliente/${id}`, body),

  deletar: (id: number) => api.delete(`/comentarios-cliente/${id}`),
};
