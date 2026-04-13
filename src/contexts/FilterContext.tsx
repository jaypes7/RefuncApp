"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "@/contexts/AuthContext";

// ── Types ────────────────────────────────────────────────────────────────────

interface FilterContextType {
  /** Centro de custo ativo (null = sem filtro / todos) */
  centroCusto: string | null;
  /** Atualiza o filtro ativo (salvo em localStorage) */
  setCentroCusto: (v: string | null) => void;
  /** Lista de centros de custo disponíveis no sistema (projetos cadastrados) */
  centrosDisponiveis: string[];
  /** true quando o filtro é fixo e não pode ser alterado (guest/user vinculados) */
  isLocked: boolean;
}

const STORAGE_KEY = "refunc_centro_custo_filter";

// ── Context ──────────────────────────────────────────────────────────────────

const FilterContext = createContext<FilterContextType | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();

  const isGuest =
    !authLoading && user?.perfil === "guest" && !!user?.centro_custo;
  const isLinkedUser =
    !authLoading && user?.perfil === "user" && !!user?.centro_custo;
  const isAdmin = !authLoading && user?.perfil === "admin";

  // Inicializa como null para evitar hydration mismatch;
  // o valor do localStorage é aplicado no useEffect de montagem.
  const [centroCusto, _setCentroCusto] = useState<string | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);

  const [centrosDisponiveis, setCentrosDisponiveis] = useState<string[]>([]);

  // Efeito de hidratação: lê localStorage apenas no cliente
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      _setCentroCusto(saved);
    }
    setHasHydrated(true);
  }, []);

  // Busca os projetos cadastrados (fonte única de verdade para a sidebar)
  useEffect(() => {
    if (typeof window === "undefined") return;

    fetch("/api/projetos")
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((json: { data?: Array<{ centro_custo: string }> }) => {
        const list = (json.data || [])
          .map((p) => p.centro_custo)
          .filter(Boolean)
          .sort();
        setCentrosDisponiveis(list);

        // Guest / user vinculado: nunca altera auto-seleção
        if (isGuest || isLinkedUser) return;

        // Admin: não força seleção automática — permite "Todos" (null)
        if (isAdmin) {
          // Se o centro salvo não existe mais na lista, limpa
          if (centroCusto && list.length > 0 && !list.includes(centroCusto)) {
            _setCentroCusto(null);
            localStorage.removeItem(STORAGE_KEY);
          }
          return;
        }

        // User não vinculado (sem centro_custo): fallback para o primeiro projeto
        if (list.length > 0 && !centroCusto) {
          _setCentroCusto(list[0]);
          localStorage.setItem(STORAGE_KEY, list[0]);
          return;
        }

        // Se o centro atual não existe mais, reseta para o primeiro
        if (centroCusto && list.length > 0 && !list.includes(centroCusto)) {
          _setCentroCusto(list[0]);
          localStorage.setItem(STORAGE_KEY, list[0]);
        }
      })
      .catch(() => setCentrosDisponiveis([]));
  }, [isGuest, isLinkedUser, isAdmin, centroCusto]);

  // Quando o usuário carrega, sobrescreve o filtro com o valor vinculado (fixo)
  useEffect(() => {
    if (authLoading) return;
    if ((isGuest || isLinkedUser) && user?.centro_custo) {
      _setCentroCusto(user.centro_custo);
      localStorage.setItem(STORAGE_KEY, user.centro_custo);
    }
  }, [authLoading, isGuest, isLinkedUser, user?.centro_custo]);

  const setCentroCusto = useCallback(
    (v: string | null) => {
      if (isGuest || isLinkedUser) return; // filtrados não podem mudar
      _setCentroCusto(v);
      if (v) {
        localStorage.setItem(STORAGE_KEY, v);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    },
    [isGuest, isLinkedUser],
  );

  return (
    <FilterContext.Provider
      value={{
        centroCusto,
        setCentroCusto,
        centrosDisponiveis,
        isLocked: isGuest || isLinkedUser,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useFilter(): FilterContextType {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error("useFilter must be used within a <FilterProvider>");
  }
  return context;
}
