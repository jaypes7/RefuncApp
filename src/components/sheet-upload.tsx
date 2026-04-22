"use client";

/**
 * ============================================================================
 * SheetUpload — Componente de Upload de Planilha por Domínio
 * ============================================================================
 *
 * Lê um arquivo .xlsx / .xls / .csv com SheetJS, converte em rows JSON
 * e envia para o endpoint informado via POST { rows: RawRow[] }.
 *
 * Props:
 *   endpoint  — rota de API que recebe { rows }  ex: "/api/rh/colaboradores"
 *   label     — texto do botão (padrão "Importar planilha")
 *   onSuccess — callback chamado após upload bem-sucedido (para refetch)
 *   variant   — variante do Button (padrão "outline")
 */

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { ButtonHTMLAttributes } from "react";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface ImportReport {
  inseridos:   number;
  atualizados: number;
  ignorados:   number;
  erros:       Array<{ linha?: number; campo?: string; motivo: string }>;
  total:       number;
}

interface SheetUploadProps {
  /** Rota de API que recebe `POST { rows: RawRow[] }` */
  endpoint: string;
  /** Texto do botão — padrão: "Importar planilha" */
  label?: string;
  /** Chamado após upload bem-sucedido (ex.: invalidar query) */
  onSuccess?: (report: ImportReport) => void;
  /** Variante do shadcn Button */
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive" | "link";
  /** Tamanho do shadcn Button */
  size?: "default" | "sm" | "lg" | "icon";
  /** Classes extras */
  className?: string;
  /** Máximo de linhas por batch (padrão: sem limite) */
  maxRows?: number;
  /**
   * Quando informado, ativa o modo de detecção de cabeçalho resiliente:
   * percorre as linhas brutas (array-of-arrays) até encontrar a primeira
   * que contenha QUALQUER das strings listadas (case-insensitive).
   * Útil para planilhas com linhas "sujas" antes do cabeçalho real
   * (ex.: células mescladas de título no Excel de Logística).
   *
   * Exemplo: `["CPF", "RE", "NOME"]`
   */
  headerDetectionKeys?: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Lê o arquivo e retorna as linhas como array de objetos.
 *
 * Quando `headerDetectionKeys` é fornecido, percorre as linhas brutas
 * (array-of-arrays) até encontrar a que contém qualquer das chaves.
 * Isso ignora linhas "sujas" de cabeçalho no Excel (células mescladas, títulos).
 */
async function parseSpreadsheet(
  file: File,
  headerDetectionKeys?: string[],
): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data     = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array", cellDates: false });
        const sheet    = workbook.Sheets[workbook.SheetNames[0]];

        // ── Modo de detecção resiliente de cabeçalho ─────────────────────
        if (headerDetectionKeys && headerDetectionKeys.length > 0) {
          const keysUpper = headerDetectionKeys.map((k) => k.toUpperCase());

          // Obtém todas as linhas como arrays (sem interpretar cabeçalho)
          const rawArrays = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
            header: 1,
            defval: "",
            raw: true,
          });

          // Localiza a primeira linha que contenha qualquer das chaves
          const headerRowIdx = rawArrays.findIndex((row) =>
            Array.isArray(row) &&
            row.some((cell) => {
              const cellStr = String(cell ?? "").trim().toUpperCase();
              return keysUpper.some((k) => cellStr.includes(k));
            }),
          );

          if (headerRowIdx >= 0) {
            // Normaliza o cabeçalho: remove espaços duplos e trim
            const headers = (rawArrays[headerRowIdx] as unknown[]).map((h) =>
              String(h ?? "").trim().replace(/\s+/g, " "),
            );

            // Converte as linhas de dados seguintes em objetos
            const rows = rawArrays
              .slice(headerRowIdx + 1)
              .map((row) => {
                const obj: Record<string, unknown> = {};
                (row as unknown[]).forEach((cell, i) => {
                  const key = headers[i];
                  if (key) obj[key] = cell;
                });
                return obj;
              })
              // Remove linhas completamente vazias
              .filter((r) => Object.values(r).some((v) => v !== "" && v !== null && v !== undefined));

            return resolve(rows);
          }
          // Fallback: cabeçalho não encontrado → parse padrão
        }

        // ── Parse padrão (primeira linha = cabeçalho) ────────────────────
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: "",
          raw: true,
        });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.readAsArrayBuffer(file);
  });
}

/** Formata o resumo do relatório para o toast */
function formatReport(report: ImportReport): string {
  const parts: string[] = [];
  if (report.inseridos  > 0) parts.push(`${report.inseridos} inseridos`);
  if (report.atualizados > 0) parts.push(`${report.atualizados} atualizados`);
  if (report.ignorados  > 0) parts.push(`${report.ignorados} ignorados`);
  if (report.erros.length > 0) parts.push(`${report.erros.length} erro(s)`);
  return parts.join(" · ") || "Nenhuma alteração";
}

// ── Componente ────────────────────────────────────────────────────────────────

export function SheetUpload({
  endpoint,
  label    = "Importar planilha",
  onSuccess,
  variant  = "outline",
  size     = "default",
  className,
  maxRows,
  headerDetectionKeys,
}: SheetUploadProps) {
  const inputRef   = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function handleFile(file: File) {
    setLoading(true);
    try {
      let rows = await parseSpreadsheet(file, headerDetectionKeys);

      if (rows.length === 0) {
        toast.warning("Planilha vazia", { description: "Nenhuma linha encontrada no arquivo." });
        return;
      }

      if (maxRows && rows.length > maxRows) {
        rows = rows.slice(0, maxRows);
        toast.warning(`Limitado a ${maxRows} linhas`, {
          description: `O arquivo tem mais linhas — apenas as primeiras ${maxRows} serão processadas.`,
        });
      }

      const res = await fetch(endpoint, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ rows }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error ?? `Erro ${res.status}`);
      }

      const report: ImportReport = await res.json();
      const summary = formatReport(report);

      if (report.erros.length > 0 && report.inseridos + report.atualizados === 0) {
        toast.error("Importação com erros", { description: summary });
      } else {
        toast.success("Importação concluída", { description: summary });
      }

      onSuccess?.(report);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Falha na importação", { description: msg });
    } finally {
      setLoading(false);
      // Limpa o input para permitir re-upload do mesmo arquivo
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.xltx"
        className="hidden"
        onChange={handleChange}
        aria-hidden="true"
      />
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled={loading}
        onClick={() => inputRef.current?.click()}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        <span className="ml-2">{loading ? "Importando…" : label}</span>
      </Button>
    </>
  );
}
