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
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Wand2, Loader2, Pencil, Eye, Save, CalendarDays, ChevronDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { marked } from "marked";

function fmtDateInput(d = new Date()): string {
  return d.toISOString().split("T")[0];
}

function fmtDateBR(dateStr: string): string {
  const [ano, mes, dia] = dateStr.split("-");
  return `${dia}/${mes}/${ano}`;
}

type RelatorioSalvo = {
  id: number;
  centro_custo: string;
  data_referencia: string;
  nome: string;
  conteudo_html: string;
  created_at: string;
  updated_at: string;
};

export default function RelatorioExecutivoPage() {
  const { centroCusto } = useFilter();
  const [relatorioMarkdown, setRelatorioMarkdown] = useState<string>("");
  const [relatorioHtmlEditado, setRelatorioHtmlEditado] = useState<string>("");
  const [editorInitialContent, setEditorInitialContent] = useState<string>("");
  const [editorKey, setEditorKey] = useState<string>("editor-empty");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [excluindoId, setExcluindoId] = useState<number | null>(null);
  const [dataBase, setDataBase] = useState<string>(fmtDateInput());
  const [relatoriosSalvos, setRelatoriosSalvos] = useState<RelatorioSalvo[]>([]);
  const [mostrarSalvos, setMostrarSalvos] = useState(false);
  const [dialogSalvarAberto, setDialogSalvarAberto] = useState(false);
  const [nomeRelatorio, setNomeRelatorio] = useState("Relatório Executivo");
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
      setEditorKey(`editor-${Date.now()}`);
    }
  }, [htmlDaIA]); // eslint-disable-line react-hooks/exhaustive-deps

  // Carrega relatórios salvos quando o centro de custo muda
  const carregarRelatoriosSalvos = useCallback(async () => {
    if (!centroCusto) return;
    try {
      const res = await fetch(
        `/api/relatorio/salvar?centro_custo=${encodeURIComponent(centroCusto)}`
      );
      if (!res.ok) return;
      const json = await res.json();
      setRelatoriosSalvos(json.data ?? []);
    } catch {
      // silencioso
    }
  }, [centroCusto]);

  useEffect(() => {
    carregarRelatoriosSalvos();
  }, [carregarRelatoriosSalvos]);

  const handleGerar = useCallback(async () => {
    setIsGenerating(true);
    try {
      const [relRes, dashRes] = await Promise.all([
        fetch("/api/relatorio/gerar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ centro_custo: centroCusto, data_base: dataBase }),
        }),
        fetch(
          `/api/dashboard/principal?centro_custo=${encodeURIComponent(
            centroCusto ?? ""
          )}&data_base=${encodeURIComponent(dataBase)}`
        ),
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
  }, [centroCusto, dataBase]);

  const handleSalvar = useCallback(async () => {
    if (!relatorioHtmlEditado || !centroCusto) {
      toast.error("Nenhum conteúdo para salvar.");
      return;
    }
    if (!nomeRelatorio.trim()) {
      toast.error("Informe um nome para o relatório.");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/relatorio/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          centro_custo: centroCusto,
          data_referencia: dataBase,
          conteudo_html: relatorioHtmlEditado,
          nome: nomeRelatorio.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error || `Erro ${res.status}`);
      }
      toast.success(`Relatório "${nomeRelatorio.trim()}" salvo com sucesso!`);
      setDialogSalvarAberto(false);
      await carregarRelatoriosSalvos();
    } catch (err: unknown) {
      console.error("[RelatorioExecutivo/Salvar]", err);
      toast.error(err instanceof Error ? err.message : "Erro ao salvar relatório");
    } finally {
      setIsSaving(false);
    }
  }, [centroCusto, dataBase, relatorioHtmlEditado, nomeRelatorio, carregarRelatoriosSalvos]);

  const handleCarregarSalvo = useCallback((rel: RelatorioSalvo) => {
    setEditorInitialContent(rel.conteudo_html);
    setRelatorioHtmlEditado(rel.conteudo_html);
    setDataBase(rel.data_referencia);
    setNomeRelatorio(rel.nome || "Relatório Executivo");
    setEditorKey(`editor-saved-${rel.id}-${Date.now()}`);
    toast.info(`Relatório "${rel.nome || "Relatório Executivo"}" carregado.`);
  }, []);

  const handleExcluirSalvo = useCallback(async (rel: RelatorioSalvo, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Deseja excluir o relatório do dia ${fmtDateBR(rel.data_referencia)}?`)) return;
    setExcluindoId(rel.id);
    try {
      const res = await fetch(`/api/relatorio/salvar?id=${rel.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error || `Erro ${res.status}`);
      }
      toast.success(`Relatório do dia ${fmtDateBR(rel.data_referencia)} excluído.`);
      await carregarRelatoriosSalvos();
    } catch (err: unknown) {
      console.error("[RelatorioExecutivo/Excluir]", err);
      toast.error(err instanceof Error ? err.message : "Erro ao excluir relatório");
    } finally {
      setExcluindoId(null);
    }
  }, [carregarRelatoriosSalvos]);

  const hasRelatorio = relatorioHtmlEditado !== "";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatório Executivo</h1>
          <p className="text-sm text-muted-foreground">
            Gere um relatório executivo com IA, edite-o livremente e exporte para PDF.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <label htmlFor="data-base" className="text-xs text-muted-foreground">
                Data de referência
              </label>
              <input
                id="data-base"
                type="date"
                value={dataBase}
                onChange={(e) => setDataBase(e.target.value)}
                className="border-none bg-transparent text-sm outline-none"
              />
            </div>
            <Button onClick={handleGerar} disabled={isGenerating} className="gap-2">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {isGenerating ? "Gerando..." : "Gerar Relatório"}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasRelatorio && (
              <>
                <Button
                  onClick={() => setDialogSalvarAberto(true)}
                  disabled={isSaving}
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isSaving ? "Salvando..." : "Salvar Relatório"}
                </Button>
                <RelatorioExportPdf targetRef={exportRef} dataReferencia={dataBase} filename={nomeRelatorio.replace(/\s+/g, "_")} />
              </>
            )}
            {relatoriosSalvos.length > 0 && (
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setMostrarSalvos((v) => !v)}
                >
                  <ChevronDown className="h-4 w-4" />
                  Relatórios salvos
                </Button>
                {mostrarSalvos && (
                  <div className="absolute right-0 z-50 mt-1 w-64 rounded-md border bg-popover shadow-md">
                    <div className="max-h-60 overflow-auto p-1">
                      {relatoriosSalvos.map((rel) => (
                        <div
                          key={rel.id}
                          className="flex items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                          <button
                            onClick={() => {
                              handleCarregarSalvo(rel);
                              setMostrarSalvos(false);
                            }}
                            className="flex-1 text-left"
                          >
                            <span className="font-medium">{rel.nome || "Relatório Executivo"}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              {fmtDateBR(rel.data_referencia)}
                            </span>
                          </button>
                          <button
                            onClick={(e) => handleExcluirSalvo(rel, e)}
                            disabled={excluindoId === rel.id}
                            className="ml-2 rounded p-1 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50"
                            title="Excluir relatório"
                          >
                            {excluindoId === rel.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialog de salvamento */}
      <Dialog open={dialogSalvarAberto} onOpenChange={setDialogSalvarAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Salvar Relatório</DialogTitle>
            <DialogDescription>
              Defina um nome para identificar este relatório. Você pode salvar vários relatórios do mesmo dia com nomes diferentes.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <label htmlFor="nome-relatorio" className="text-sm font-medium">
                Nome do relatório
              </label>
              <Input
                id="nome-relatorio"
                value={nomeRelatorio}
                onChange={(e) => setNomeRelatorio(e.target.value)}
                placeholder="Ex: Relatório Parcial da Manhã"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogSalvarAberto(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar} disabled={isSaving || !nomeRelatorio.trim()}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              key={editorKey}
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
              <p className="text-sm text-gray-600">Data de referência: {fmtDateBR(dataBase)}</p>
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
              Clique em <strong>&quot;Gerar Relatório&quot;</strong> para criar o relatório com base nos dados do
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
