import { api } from "@/lib/http";

export interface User {
  re: string;
  nome: string | null;
  perfil: string | null;
  centro_custo?: string[] | null;
  precisaRedefinirSenha?: boolean;
}

export const authApi = {
  login: (re: string, senha: string) =>
    api.post<{
      success: boolean;
      user: User;
    }>("/auth/login", { re, senha }),

  logout: () => api.post("/auth/logout"),

  me: () =>
    api.get<{
      user: User;
    }>("/auth/me"),

  resetPassword: (novaSenha: string) =>
    api.post("/auth/reset-password", { novaSenha }),
};
