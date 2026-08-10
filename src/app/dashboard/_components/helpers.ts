import type { DashboardPrincipalData } from "@/lib/axios";
import type { GrupoEtapa } from "@/services/config";

export type EtapaDashboard = DashboardPrincipalData["etapas"][number];

/** Etapas agrupadas por fase (GRUPOS_ETAPAS da config), ou null quando não há grupos. */
export type EtapasPorGrupo = {
  grupos: GrupoEtapa[];
  byGrupo: Map<number | null, EtapaDashboard[]>;
} | null;

export function fmtDate(v: string | undefined | null): string | null {
  if (!v) return null;
  const d = new Date(v + "T00:00:00Z");
  return isNaN(d.getTime()) ? null : d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function isEtapaAtrasada(etapa: EtapaDashboard): boolean {
  const hojeRealStr = new Date().toISOString().split("T")[0];

  // Caso 1: etapa passou do prazo final e não foi concluída
  if (etapa.dataFim && hojeRealStr > etapa.dataFim && etapa.percentualConcluido < 100) {
    return true;
  }

  // Caso 2: dentro do prazo, mas evolução diária está abaixo do previsto
  if (etapa.evolucaoDiaria && etapa.evolucaoDiaria.length > 0) {
    let lastBeforeToday = -1;
    for (let i = 0; i < etapa.evolucaoDiaria.length; i++) {
      if (etapa.evolucaoDiaria[i].data <= hojeRealStr) lastBeforeToday = i;
      else break;
    }

    if (lastBeforeToday !== -1) {
      const previsto = etapa.evolucaoDiaria[lastBeforeToday].previsto;
      const realizado = etapa.evolucaoDiaria[lastBeforeToday].realizado;
      return realizado < previsto;
    }
  }

  return false;
}
