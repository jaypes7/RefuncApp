"use client";

/**
 * ExportButton
 * ─────────────────────────────────────────────────────────────────────────────
 * Botão reutilizável de exportação XLSX.
 *
 * Chama GET /api/export (com filtros opcionais), converte a resposta JSON em
 * uma planilha .xlsx via SheetJS e dispara o download no navegador — tudo
 * client-side, sem gerar arquivos no servidor.
 *
 * Props:
 *  filters   – { search?, status?, setor? } — passados como query-params
 *  label     – texto do botão (default: "Exportar .xlsx")
 *  filename  – prefixo do arquivo baixado (default: "colaboradores")
 *  variant   – variante shadcn/Button (default: "outline")
 *  size      – tamanho shadcn/Button (default: "default")
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ExportFilters {
  search?: string;
  status?: string;
  cargo?: string;
}

interface ColaboradorRow {
  CPF?: string | null;
  NOME?: string | null;
  STATUS?: string | null;
  FUNCAO_CLT?: string | null;
  DATA_ADMISSAO?: string | null;
  MUNICIPIO?: string | null;
  UF?: string | null;
  TELEFONE?: string | null;
  RE?: string | null;
  MOB?: string | null;
  ASO?: string | null;
  TREINAMENTO?: string | null;
  IND?: string | null;
  ENVIADO_RH?: string | null;
  CONTRATO?: string | null;
  PORTAL?: string | null;
  CRACHA?: string | null;
  PONTO?: string | null;
  VR?: string | null;
  TERMINO?: string | null;
  PRORROGACAO?: string | null;
  DEMISSAO?: string | null;
  DT_NASCIMENTO?: string | null;
  IDADE?: number | null;
  TURNO_TRABALHO?: string | null;
  EXAME?: string | null;
  CLINICA?: string | null;
  VINCULADO?: string | null;
  OP?: string | null;
  HISTOGRAMA?: string | null;
  CHECK_IN?: string | null;
  HOTEL?: string | null;
  DATA_VIAGEM?: string | null;
  NUMERO_ORACLE?: string | null;
  CENTRO_CUSTO?: string | null;
  CREATED_AT?: string | null;
}

interface ExportButtonProps {
  filters?: ExportFilters;
  label?: string;
  filename?: string;
  variant?: "outline" | "default" | "ghost" | "secondary" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Monta os cabeçalhos legíveis e os valores de cada linha para a planilha. */
function toSheetRow(c: ColaboradorRow): Record<string, string | number | null> {
  return {
    CPF:                  c.CPF ?? "",
    Nome:                 c.NOME ?? "",
    Status:               c.STATUS ?? "",
    "Função CLT":         c.FUNCAO_CLT ?? "",
    "Data Admissão":      c.DATA_ADMISSAO ?? "",
    "Turno Trabalho":     c.TURNO_TRABALHO ?? "",
    Município:            c.MUNICIPIO ?? "",
    UF:                   c.UF ?? "",
    Telefone:             c.TELEFONE ?? "",
    RE:                   c.RE ?? "",
    MOB:                  c.MOB ?? "",
    ASO:                  c.ASO ?? "",
    Exame:                c.EXAME ?? "",
    Clínica:              c.CLINICA ?? "",
    Treinamento:          c.TREINAMENTO ?? "",
    "Ind.":               c.IND ?? "",
    "Enviado RH":         c.ENVIADO_RH ?? "",
    Contrato:             c.CONTRATO ?? "",
    Portal:               c.PORTAL ?? "",
    Crachá:               c.CRACHA ?? "",
    Ponto:                c.PONTO ?? "",
    VR:                   c.VR ?? "",
    Vinculado:            c.VINCULADO ?? "",
    OP:                   c.OP ?? "",
    Histograma:           c.HISTOGRAMA ?? "",
    Término:              c.TERMINO ?? "",
    Prorrogação:          c.PRORROGACAO ?? "",
    Demissão:             c.DEMISSAO ?? "",
    "DT Nascimento":      c.DT_NASCIMENTO ?? "",
    Idade:                c.IDADE ?? "",
    "Check In":           c.CHECK_IN ?? "",
    Hotel:                c.HOTEL ?? "",
    "Data Viagem":        c.DATA_VIAGEM ?? "",
    "Nº Oracle":          c.NUMERO_ORACLE ?? "",
    "Centro Custo":       c.CENTRO_CUSTO ?? "",
    "Created At":         c.CREATED_AT ?? "",
  };
}

/** Define largura automática das colunas (mínimo 10 chars, máximo 40). */
function autoColWidths(rows: Record<string, string | number | null>[]): XLSX.ColInfo[] {
  if (rows.length === 0) return [];
  return Object.keys(rows[0]).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...rows.map((r) => String(r[key] ?? "").length),
    );
    return { wch: Math.min(Math.max(maxLen, 10), 40) };
  });
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function ExportButton({
  filters = {},
  label = "Exportar .xlsx",
  filename = "colaboradores",
  variant = "outline",
  size = "default",
  className,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Monta query-string a partir dos filtros ativos
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.status) params.set("status", filters.status);
      if (filters.cargo)  params.set("cargo", filters.cargo);
      const qs = params.toString();

      const res = await fetch(`/api/export${qs ? `?${qs}` : ""}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? "Falha ao buscar dados",
        );
      }

      const { data } = (await res.json()) as { data: ColaboradorRow[]; total: number };

      if (!data.length) {
        toast.warning("Nenhum colaborador encontrado com os filtros atuais.");
        return;
      }

      // Converte para linhas da planilha
      const sheetRows = data.map(toSheetRow);

      // Cria workbook e worksheet
      const worksheet = XLSX.utils.json_to_sheet(sheetRows);
      worksheet["!cols"] = autoColWidths(sheetRows);

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Colaboradores");

      // Dispara download
      const dateStr = new Date().toISOString().split("T")[0];
      XLSX.writeFile(workbook, `${filename}_${dateStr}.xlsx`);

      toast.success(
        `${data.length} colaborador${data.length !== 1 ? "es" : ""} exportado${data.length !== 1 ? "s" : ""} com sucesso!`,
      );
    } catch (err) {
      console.error("[ExportButton]", err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Erro ao exportar planilha. Tente novamente.",
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      variant={variant}
      size={size}
      className={`gap-2 ${className ?? ""}`}
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {isExporting ? "Exportando..." : label}
    </Button>
  );
}
