"use client";

import { FilterContext } from "@/contexts/FilterContext";

interface TvFilterProviderProps {
  centroCusto: string;
  children: React.ReactNode;
}

export function TvFilterProvider({ centroCusto, children }: TvFilterProviderProps) {
  return (
    <FilterContext.Provider
      value={{
        centroCusto,
        setCentroCusto: () => {},
        centrosDisponiveis: [],
        isReady: true,
        isResolving: false,
        isLocked: true,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}
