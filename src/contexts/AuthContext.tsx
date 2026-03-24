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
  login: (re: string) => Promise<void>;
  logout: () => void;
  error: string | null;
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
        console.log("[AuthContext] Verificando sessão...");
        const { data } = await authApi.me();
        if (data.user) {
          console.log("[AuthContext] Sessão encontrada:", data.user);
          setUser(data.user);
        }
      } catch {
        console.log("[AuthContext] Sem sessão ativa");
        // Não faz nada, usuário não está logado
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  /**
   * Login - valida RE contra a API/backend (Google Sheets)
   */
  const login = useCallback(
    async (re: string) => {
      setError(null);
      setIsLoading(true);

      try {
        console.log("[AuthContext] Iniciando login para RE:", re);
        const { data } = await authApi.login(re);
        console.log("[AuthContext] Resposta da API:", data);

        if (data.success && data.user) {
          setUser(data.user);
          console.log("[AuthContext] Usuário definido, redirecionando...");
          router.push("/central");
        } else {
          throw new Error("Resposta inválida do servidor");
        }
      } catch (err: unknown) {
        console.error("[AuthContext] Erro no login:", err);
        const e = err as {
          response?: { data?: { error?: string } };
          message?: string;
        };
        const message =
          e.response?.data?.error ||
          e.message ||
          "Erro ao fazer login. Tente novamente.";
        setError(message);
        throw new Error(message);
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        error,
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
