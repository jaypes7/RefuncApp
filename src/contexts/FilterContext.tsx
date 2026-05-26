"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

interface FilterContextType {
  /** Centro de custo ativo (null = todos, somente depois de isReady). */
  centroCusto: string | null;
  /** Atualiza o filtro ativo (salvo em localStorage). */
  setCentroCusto: (v: string | null) => void;
  /** Lista de centros de custo disponiveis no sistema. */
  centrosDisponiveis: string[];
  /** true quando auth, hidratacao e projetos ja foram resolvidos. */
  isReady: boolean;
  /** true enquanto o filtro ainda esta sendo resolvido. */
  isResolving: boolean;
  /** true quando o filtro e fixo e nao pode ser alterado. */
  isLocked: boolean;
}

const STORAGE_KEY = "refunc_centro_custo_filter";

export const FilterContext = createContext<FilterContextType | null>(null);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const hasHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [savedCc, setSavedCc] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem(STORAGE_KEY),
  );

  const isGuest =
    !authLoading && user?.perfil === "guest" && !!user?.centro_custo;
  const isLinkedUser =
    !authLoading && user?.perfil === "user" && !!user?.centro_custo;
  const isAdmin = !authLoading && user?.perfil === "admin";

  const userCentros = useMemo(() => {
    const cc = user?.centro_custo;
    if (Array.isArray(cc)) return cc;
    if (typeof cc === "string" && cc) return [cc];
    return [];
  }, [user?.centro_custo]);

  const {
    data: centrosDisponiveis = [],
    isFetched: centrosFetched,
  } = useQuery<string[]>({
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

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setSavedCc(e.newValue);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const centrosQueryEnabled = hasHydrated && !authLoading && !!user;
  const centrosResolved = !centrosQueryEnabled || centrosFetched;
  const isReady = hasHydrated && !authLoading && !!user && centrosResolved;

  const resolvedCc = useMemo(() => {
    if (!isReady || !user) return undefined;
    const saved = savedCc;

    if (isAdmin) {
      return saved && centrosDisponiveis.includes(saved) ? saved : null;
    }

    if (isGuest || isLinkedUser) {
      const permitidos = userCentros.filter((c) =>
        centrosDisponiveis.includes(c),
      );
      if (permitidos.length === 0) return null;
      return saved && permitidos.includes(saved) ? saved : permitidos[0];
    }

    return saved && centrosDisponiveis.includes(saved)
      ? saved
      : centrosDisponiveis[0] ?? null;
  }, [
    isReady,
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
      if (isGuest || isLinkedUser) {
        if (v && !userCentros.includes(v)) return;
        if (!v) return;
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

  const centroCusto = isReady ? resolvedCc ?? null : null;

  return (
    <FilterContext.Provider
      value={{
        centroCusto,
        setCentroCusto,
        centrosDisponiveis,
        isReady,
        isResolving: !isReady,
        isLocked: isGuest || isLinkedUser,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter(): FilterContextType {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error("useFilter must be used within a <FilterProvider>");
  }
  return context;
}
