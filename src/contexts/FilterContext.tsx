"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

  // Lista de centros de custo permitidos para o usuário atual (memoizada)
  const userCentros = useMemo(() => {
    const cc = user?.centro_custo;
    if (Array.isArray(cc)) return cc;
    if (typeof cc === "string" && cc) return [cc];
    return [];
  }, [user?.centro_custo]);

  // Efeito de hidratação: lê localStorage apenas no cliente
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      _setCentroCusto(saved);
    }
    setHasHydrated(true);
  }, []);

  // Busca os projetos cadastrados (fonte única de verdade para a sidebar)
  // Este useEffect NÃO altera centroCusto — apenas busca a lista.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasHydrated) return;

    fetch("/api/projetos")
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((json: { data?: Array<{ centro_custo: string }> }) => {
        const list = (json.data || [])
          .map((p) => p.centro_custo)
          .filter(Boolean)
          .sort();
        setCentrosDisponiveis(list);
      })
      .catch(() => setCentrosDisponiveis([]));
  }, [hasHydrated]);

  // Inicializa / atualiza o centro de custo quando mudam:
  // - lista de projetos disponíveis
  // - perfil do usuário
  // - hidratação completa
  // NÃO observa "centroCusto" para evitar loop.
  useEffect(() => {
    if (!hasHydrated) return;
    if (centrosDisponiveis.length === 0) return;

    const saved = localStorage.getItem(STORAGE_KEY);

    // Admin: usa valor salvo se existir na lista, senão null (Todos)
    if (isAdmin) {
      if (saved && centrosDisponiveis.includes(saved)) {
        _setCentroCusto(saved);
      } else {
        _setCentroCusto(null);
        localStorage.removeItem(STORAGE_KEY);
      }
      return;
    }

    // Guest / user vinculado: só pode escolher entre projetos permitidos
    if (isGuest || isLinkedUser) {
      const permitidos = userCentros.filter((c) =>
        centrosDisponiveis.includes(c),
      );
      if (permitidos.length === 0) return;

      const ativo =
        saved && permitidos.includes(saved) ? saved : permitidos[0];
      _setCentroCusto(ativo);
      localStorage.setItem(STORAGE_KEY, ativo);
      return;
    }

    // User não vinculado (sem centro_custo): usa valor salvo ou primeiro projeto
    if (saved && centrosDisponiveis.includes(saved)) {
      _setCentroCusto(saved);
    } else {
      _setCentroCusto(centrosDisponiveis[0]);
      localStorage.setItem(STORAGE_KEY, centrosDisponiveis[0]);
    }
  }, [hasHydrated, centrosDisponiveis, isAdmin, isGuest, isLinkedUser, userCentros]);

  const setCentroCusto = useCallback(
    (v: string | null) => {
      // Guest / user vinculado: só permite trocar entre projetos autorizados
      if (isGuest || isLinkedUser) {
        if (v && !userCentros.includes(v)) return;
        _setCentroCusto(v);
        if (v) localStorage.setItem(STORAGE_KEY, v);
        else localStorage.removeItem(STORAGE_KEY);
        return;
      }
      _setCentroCusto(v);
      if (v) {
        localStorage.setItem(STORAGE_KEY, v);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    },
    [isGuest, isLinkedUser, userCentros],
  );

  return (
    <FilterContext.Provider
      value={{
        centroCusto,
        setCentroCusto,
        centrosDisponiveis,
        isLocked: false,
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
