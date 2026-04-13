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
  /** true para convidados — o filtro é fixo e não pode ser alterado */
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

  // Inicializa com o valor do localStorage (ou null)
  const [centroCusto, _setCentroCusto] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEY) || null;
  });

  // Quando o usuário carrega, sobrescreve o filtro com o valor do guest (fixo)
  useEffect(() => {
    if (authLoading) return;
    if (isGuest && user?.centro_custo) {
      _setCentroCusto(user.centro_custo);
      localStorage.setItem(STORAGE_KEY, user.centro_custo);
    }
  }, [authLoading, isGuest, user?.centro_custo]);

  const setCentroCusto = useCallback(
    (v: string | null) => {
      if (isGuest) return; // guests não podem mudar o filtro
      _setCentroCusto(v);
      if (v) {
        localStorage.setItem(STORAGE_KEY, v);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    },
    [isGuest],
  );

  return (
    <FilterContext.Provider value={{ centroCusto, setCentroCusto, isLocked: isGuest }}>
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
