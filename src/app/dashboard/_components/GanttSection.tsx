"use client";

import { useEffect, useRef, useState } from "react";
import { ListChecks } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GanttCronograma } from "@/components/gantt-cronograma";
import type { ConfigData } from "@/lib/axios";
import type { EtapaDashboard, EtapasPorGrupo } from "./helpers";

export function GanttSection({
  etapas,
  etapasPorGrupo,
  configData,
}: {
  etapas: EtapaDashboard[];
  etapasPorGrupo: EtapasPorGrupo;
  configData: ConfigData | undefined;
}) {
  // Inicia com todos os grupos colapsados (preenchido uma única vez)
  const [collapsedGrupos, setCollapsedGrupos] = useState<Set<number>>(new Set());
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current && etapasPorGrupo?.grupos.length) {
      setCollapsedGrupos(new Set(etapasPorGrupo.grupos.map((g) => g.id)));
      initialized.current = true;
    }
  }, [etapasPorGrupo]);

  const toggleGrupo = (id: number) =>
    setCollapsedGrupos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  return (
    <div className="mb-6">
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary" />
          <CardTitle>Cronograma de Etapas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <GanttCronograma
            etapas={etapas}
            etapasPorGrupo={etapasPorGrupo}
            configData={configData}
            collapsedGrupos={collapsedGrupos}
            onToggleGrupo={toggleGrupo}
          />
        </CardContent>
      </Card>
    </div>
  );
}
