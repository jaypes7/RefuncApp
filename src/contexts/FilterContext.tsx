"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
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

  const [centroCusto, _setCentroCusto] = useState<string | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);

  // Hidratação sem effect: só executa no cliente
  if (!hasHydrated && typeof window !== "undefined") {
    setHasHydrated(true);
  }

  // Lista de centros de custo permitidos para o usuário atual (memoizada)
  const userCentros = useMemo(() => {
    const cc = user?.centro_custo;
    if (Array.isArray(cc)) return cc;
    if (typeof cc === "string" && cc) return [cc];
    return [];
  }, [user?.centro_custo]);

  // Busca os projetos cadastrados via React Query (reativo a invalidações)
  const { data: centrosDisponiveis = [] } = useQuery<string[]>({
    queryKey: ["projetos", "centros"],
    queryFn: async () => {
      const res = await fetch("/api/projetos");
      if (!res.ok) return [];
      const json = (await res.json()) as { data?: Array<{ centro_custo: string }> };
      return (json.data || [])
        .map((p) => p.centro_custo)
        .filter(Boolean)
        .sort();
    },
    enabled: hasHydrated,
  });

  // Calcula o centro de custo ideal com base nos dados externos (sem effect)
  const idealCc = useMemo(() => {
    if (!hasHydrated || centrosDisponiveis.length === 0) return undefined;
    const saved = localStorage.getItem(STORAGE_KEY);

    if (isAdmin) {
      return saved && centrosDisponiveis.includes(saved) ? saved : null;
    }

    if (isGuest || isLinkedUser) {
      const permitidos = userCentros.filter((c) =>
        centrosDisponiveis.includes(c),
      );
      if (permitidos.length === 0) return undefined;
      return saved && permitidos.includes(saved) ? saved : permitidos[0];
    }

    return saved && centrosDisponiveis.includes(saved)
      ? saved
      : centrosDisponiveis[0];
  }, [hasHydrated, centrosDisponiveis, isAdmin, isGuest, isLinkedUser, userCentros]);

  // Aplica o centro de custo ideal quando ele muda
  if (idealCc !== undefined && idealCc !== centroCusto) {
    _setCentroCusto(idealCc);
    if (idealCc) {
      localStorage.setItem(STORAGE_KEY, idealCc);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

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
