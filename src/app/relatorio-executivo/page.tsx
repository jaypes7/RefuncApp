"use client";

/**
 * Relatório Executivo
 * ─────────────────────────────────────────────────────────────────────────────
 * Página para geração de relatório executivo via IA (Kimi/Moonshot),
 * edição livre em rich text e exportação para PDF.
 *
 * Arquitetura (desacoplada):
 *   • Editor TipTap é NÃO-CONTROLADO — recebe initialContent uma vez e
 *     gerencia o estado internamente. O pai nunca repassa HTML de volta.
 *   • Prévia do PDF reflete o estado via dangerouslySetInnerHTML.
 *   • Exportação captura o container de prévia (que inclui gráfico + texto).
 */

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useFilter } from "@/contexts/FilterContext";
import { RelatorioEditor } from "@/components/relatorio-editor";
import { RelatorioExportPdf } from "@/components/relatorio-export-pdf";
import { RelatorioCurvaChart, type CurvaSData } from "@/components/relatorio-curva-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wand2, Loader2, Pencil, Eye } from "lucide-react";
import { toast } from "sonner";
import { marked } from "marked";

export default function RelatorioExecutivoPage() {
  const { centroCusto } = useFilter();
  const [relatorioMarkdown, setRelatorioMarkdown] = useState<string>("");
  const [relatorioHtmlEditado, setRelatorioHtmlEditado] = useState<string>("");
  const [editorInitialContent, setEditorInitialContent] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [curvaSData, setCurvaSData] = useState<CurvaSData | null>(null);
  const [curvaSValoresHoje, setCurvaSValoresHoje] = useState<{
    planejado: number;
    realizado: number;
  } | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  // Converte Markdown (da IA) em HTML para inicializar o editor
  const htmlDaIA = useMemo(() => {
    if (!relatorioMarkdown) return "";
    return marked.parse(relatorioMarkdown, { async: false }) as string;
  }, [relatorioMarkdown]);

  // Quando a IA gera novo conteúdo, alimenta o editor UMA ÚNICA VEZ
  useEffect(() => {
    if (htmlDaIA && htmlDaIA !== editorInitialContent) {
      setEditorInitialContent(htmlDaIA);
      setRelatorioHtmlEditado(htmlDaIA);
    }
  }, [htmlDaIA]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGerar = useCallback(async () => {
    setIsGenerating(true);
    try {
      const [relRes, dashRes] = await Promise.all([
        fetch("/api/relatorio/gerar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ centro_custo: centroCusto }),
        }),
        fetch(`/api/dashboard/principal?centro_custo=${encodeURIComponent(centroCusto ?? "")}`),
      ]);

      if (!relRes.ok) {
        const err = await relRes.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error || `Erro ${relRes.status}`);
      }

      const relData = await relRes.json();
      if (!relData.relatorio) throw new Error("Resposta vazia da IA");

      setRelatorioMarkdown(relData.relatorio);

      if (dashRes.ok) {
        const dashData = await dashRes.json();
        const curva = dashData?.graficos?.curvaS as CurvaSData | undefined;
        if (curva && curva.labels?.length > 0) setCurvaSData(curva);
        const diario = dashData?.graficos?.curvaS?.valoresHoje?.diario as
          | { planejado: number; realizado: number }
          | undefined;
        if (diario) setCurvaSValoresHoje(diario);
      }

      toast.success("Relatório gerado com sucesso!");
    } catch (err: unknown) {
      console.error("[RelatorioExecutivo]", err);
      toast.error(err instanceof Error ? err.message : "Erro ao gerar relatório");
    } finally {
      setIsGenerating(false);
    }
  }, [centroCusto]);

  const hasRelatorio = relatorioHtmlEditado !== "";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatório Executivo</h1>
          <p className="text-sm text-muted-foreground">
            Gere um relatório executivo com IA, edite-o livremente e exporte para PDF.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleGerar} disabled={isGenerating} className="gap-2">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {isGenerating ? "Gerando..." : "Gerar com IA"}
          </Button>
          {hasRelatorio && <RelatorioExportPdf targetRef={exportRef} />}
        </div>
      </div>

      {/* ── 1. EDITOR (edição) ── */}
      {hasRelatorio && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Pencil className="h-4 w-4 text-primary" />
              <span>Editor — Edite o relatório aqui</span>
              <Badge variant="secondary" className="ml-2 text-xs">Área de Edição</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RelatorioEditor
              key={editorInitialContent ? "editor-mounted" : "editor-empty"}
              initialContent={editorInitialContent}
              onChange={(html) => setRelatorioHtmlEditado(html)}
            />
          </CardContent>
        </Card>
      )}

      {/* ── 2. PRÉVIA DO PDF (exportação) ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Eye className="h-4 w-4 text-primary" />
            <span>Prévia do PDF</span>
            <Badge variant="outline" className="ml-2 text-xs border-primary text-primary">Visualização de Exportação</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            ref={exportRef}
            className="rounded-lg bg-white text-black"
            style={{ color: "#000000", backgroundColor: "#ffffff" }}
          >
            {/* Cabeçalho */}
            <div className="border-b border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900">Relatório Executivo</h2>
              <p className="text-sm text-gray-600">Centro de Custo: {centroCusto ?? "Todos"}</p>
            </div>

            {/* Gráfico */}
            {curvaSData && curvaSData.labels.length > 0 && (
              <div className="border-b border-gray-200 p-6">
                <h3 className="mb-2 text-base font-semibold text-gray-800">Curva de Avanço</h3>
                {curvaSValoresHoje && (
                  <div className="mb-4 flex flex-wrap gap-3">
                    <div className="rounded-md bg-gray-50 px-3 py-1.5 text-xs">
                      <span className="text-gray-500">Planejado (dia atual):</span>{" "}
                      <span className="font-semibold text-gray-700">{curvaSValoresHoje.planejado.toFixed(1)}%</span>
                    </div>
                    <div className="rounded-md bg-red-50 px-3 py-1.5 text-xs">
                      <span className="text-gray-500">Realizado (dia atual):</span>{" "}
                      <span className="font-semibold text-red-700">{curvaSValoresHoje.realizado.toFixed(1)}%</span>
                    </div>
                    <div className="rounded-md bg-gray-100 px-3 py-1.5 text-xs">
                      <span className="text-gray-500">Desvio:</span>{" "}
                      <span className={`font-semibold ${curvaSValoresHoje.realizado >= curvaSValoresHoje.planejado ? "text-green-700" : "text-red-700"}`}>
                        {(curvaSValoresHoje.realizado - curvaSValoresHoje.planejado).toFixed(1)} p.p.
                      </span>
                    </div>
                  </div>
                )}
                <RelatorioCurvaChart data={curvaSData} valoresHoje={curvaSValoresHoje ?? undefined} />
              </div>
            )}

            {/* Conteúdo */}
            <div className="p-6 prose prose-sm max-w-none" style={{ color: "#1f2937" }}>
              {relatorioHtmlEditado ? (
                <div dangerouslySetInnerHTML={{ __html: relatorioHtmlEditado }} />
              ) : (
                <p className="text-gray-400 italic">O relatório aparecerá aqui após a geração.</p>
              )}
            </div>
          </div>

          {!hasRelatorio && !isGenerating && (
            <div className="mt-8 text-center text-sm text-muted-foreground">
              Clique em <strong>&quot;Gerar com IA&quot;</strong> para criar o relatório com base nos dados do
              dashboard e cronograma do centro de custo <span className="font-semibold text-foreground">{centroCusto ?? "Todos"}</span>.
            </div>
          )}

          {isGenerating && !hasRelatorio && (
            <div className="mt-8 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p>A IA está analisando os dados do projeto e redigindo o relatório...</p>
              <p className="text-xs">Isso pode levar alguns segundos.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
