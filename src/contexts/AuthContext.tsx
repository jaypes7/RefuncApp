"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { authApi, type User } from "@/lib/axios";

// ── Types ────────────────────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (re: string, senha: string) => Promise<void>;
  logout: () => void;
  error: string | null;
  refreshUser: () => Promise<void>;
}

// ── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Começa como true para verificar sessão
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Verifica se há sessão ativa ao carregar
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await authApi.me();
        if (data.user) {
          setUser(data.user);
        }
      } catch {
        // Não faz nada, usuário não está logado
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  /**
   * Login - valida RE e senha contra a API/backend
   */
  const login = useCallback(
    async (re: string, senha: string) => {
      setError(null);
      setIsLoading(true);

      try {
        const { data } = await authApi.login(re, senha);

        if (data.success && data.user) {
          setUser(data.user);
          router.push(data.user.perfil === "guest" ? "/dashboard" : "/central");
        } else {
          throw new Error("Resposta inválida do servidor");
        }
      } catch (err: unknown) {
        const e = err as {
          response?: { data?: { error?: string } };
          message?: string;
        };
        const message =
          e.response?.data?.error ||
          e.message ||
          "Erro ao fazer login. Tente novamente.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  /**
   * Logout - limpa sessão e redireciona para login
   */
  const logout = useCallback(async () => {
    try {
      // Tenta chamar logout na API (pode falhar silenciosamente)
      await authApi.logout().catch(() => {
        // Ignora erro no logout
      });
    } finally {
      setUser(null);
      router.push("/login");
    }
  }, [router]);

  /**
   * Recarrega dados do usuário atual (útil após redefinir senha)
   */
  const refreshUser = useCallback(async () => {
    try {
      const { data } = await authApi.me();
      if (data.user) {
        setUser(data.user);
      }
    } catch {
      // Ignora erro
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        error,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return context;
}
