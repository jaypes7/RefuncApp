"use client";

import { memo } from "react";
import { Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConfigData } from "@/lib/axios";

export const ProjetoInfoCard = memo(function ProjetoInfoCard({
  configData,
}: {
  configData: ConfigData;
}) {
  return (
    <Card data-cardtv-id="geral-info-projeto" className="glass-card mb-6">
      <CardHeader className="pb-3 flex flex-row items-center gap-2">
        <Briefcase className="h-4 w-4 text-primary" />
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Informações do Projeto
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
          {configData.NOME_CLIENTE && (
            <div>
              <p className="text-xs text-muted-foreground">Cliente</p>
              <p className="text-sm font-semibold truncate" title={configData.NOME_CLIENTE}>{configData.NOME_CLIENTE}</p>
            </div>
          )}
          {configData.CENTRO_CUSTO && (
            <div>
              <p className="text-xs text-muted-foreground">Centro de Custo</p>
              <p className="text-sm font-semibold truncate" title={configData.CENTRO_CUSTO}>{configData.CENTRO_CUSTO}</p>
            </div>
          )}
          {configData.GERENTE_OPERACOES && (
            <div>
              <p className="text-xs text-muted-foreground">Ger. Operações</p>
              <p className="text-sm font-semibold truncate" title={configData.GERENTE_OPERACOES}>{configData.GERENTE_OPERACOES}</p>
            </div>
          )}
          {configData.GERENTE_CONTRATO && (
            <div>
              <p className="text-xs text-muted-foreground">Ger. Contrato</p>
              <p className="text-sm font-semibold truncate" title={configData.GERENTE_CONTRATO}>{configData.GERENTE_CONTRATO}</p>
            </div>
          )}
          {configData.DATA_INICIO_PROJETO && (
            <div>
              <p className="text-xs text-muted-foreground">Início da mobilização</p>
              <p className="text-sm font-semibold">
                {new Date(configData.DATA_INICIO_PROJETO + "T00:00:00Z").toLocaleDateString("pt-BR", { timeZone: "UTC" })}
              </p>
            </div>
          )}
          {configData.DATA_FIM_PROJETO && (
            <div>
              <p className="text-xs text-muted-foreground">Término da mobilização</p>
              <p className="text-sm font-semibold">
                {new Date(configData.DATA_FIM_PROJETO + "T00:00:00Z").toLocaleDateString("pt-BR", { timeZone: "UTC" })}
              </p>
            </div>
          )}
          {configData.META_ADMISSOES > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">Meta Admissões</p>
              <p className="text-sm font-semibold">{configData.META_ADMISSOES}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
