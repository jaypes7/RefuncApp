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
        // Se não há centro de custo selecionado e há opções disponíveis,
        // seleciona o primeiro automaticamente (exceto para guests que têm o seu)
        if (!isGuest && list.length > 0 && !centroCusto) {
          _setCentroCusto(list[0]);
          localStorage.setItem(STORAGE_KEY, list[0]);
        }
      })
      .catch(() => setCentrosDisponiveis([]));
  }, [isGuest, centroCusto]);

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
    <FilterContext.Provider
      value={{ centroCusto, setCentroCusto, centrosDisponiveis, isLocked: isGuest }}
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
