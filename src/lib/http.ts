/**
 * Cliente HTTP (axios) para comunicação com as APIs do Next.js.
 * As funções de API de cada domínio ficam em `src/services/*`.
 */

import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Importante: envia cookies JWT
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 - sessão expirada/não autorizado: volta para o login preservando a rota atual
    if (error.response?.status === 401) {
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        const rotaAtual = `${window.location.pathname}${window.location.search}`;
        window.location.href = `/login?redirect=${encodeURIComponent(rotaAtual)}`;
      }
    }

    return Promise.reject(error);
  }
);
