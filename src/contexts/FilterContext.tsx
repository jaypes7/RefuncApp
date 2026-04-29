"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

  const [savedCc, setSavedCc] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem(STORAGE_KEY),
  );

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
  // A queryKey inclui user?.re para garantir refetch quando o usuário loga/troca
  const { data: centrosDisponiveis = [] } = useQuery<string[]>({
    queryKey: ["projetos", "centros", user?.re],
    queryFn: async () => {
      const res = await fetch("/api/projetos");
      if (!res.ok) return [];
      const json = (await res.json()) as {
        data?: Array<{ centro_custo: string }>;
      };
      return (json.data || [])
        .map((p) => p.centro_custo)
        .filter(Boolean)
        .sort();
    },
    enabled: hasHydrated && !authLoading && !!user,
  });

  // Escuta mudanças no localStorage vindas de outras abas
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setSavedCc(e.newValue);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // Calcula o centro de custo efetivo com base nos dados externos
  const resolvedCc = useMemo(() => {
    if (!hasHydrated || centrosDisponiveis.length === 0 || !user)
      return undefined;
    const saved = savedCc;

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
  }, [
    hasHydrated,
    centrosDisponiveis,
    isAdmin,
    isGuest,
    isLinkedUser,
    userCentros,
    savedCc,
    user,
  ]);

  const setCentroCusto = useCallback(
    (v: string | null) => {
      // Guest / user vinculado: só permite trocar entre projetos autorizados
      if (isGuest || isLinkedUser) {
        if (v && !userCentros.includes(v)) return;
      }
      if (v) {
        localStorage.setItem(STORAGE_KEY, v);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      setSavedCc(v);
    },
    [isGuest, isLinkedUser, userCentros],
  );

  const centroCusto = resolvedCc ?? null;

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
