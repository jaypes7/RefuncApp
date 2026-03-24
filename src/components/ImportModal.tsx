"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

import { processImport, type RawRow } from "@/services/import-service";

// ============================================================================
// CONSTANTES
// ============================================================================

// ============================================================================
// TIPOS
// ============================================================================

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface PreviewRow {
  CPF: string;
  NOME: string;
  STATUS: string;
  DATA_ADMISSAO: string;
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

// ============================================================================
// COMPONENTE
// ============================================================================

export function ImportModal({
  open,
  onOpenChange,
  onSuccess,
}: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewRow[] | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  /** Linhas brutas em memória — evita re-ler o arquivo no handleImport */
  const [bufferedRows, setBufferedRows] = useState<RawRow[] | null>(null);

  /**
   * Processa o arquivo XLSX selecionado
   */
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;

      setFile(selectedFile);
      setValidationErrors([]);
      setPreviewData(null);

      const reader = new FileReader();

      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });

          // 1. Busca inteligente da aba (REFUNC > CONTROLE > primeira aba)
          const targetSheetName =
            workbook.SheetNames.find(
              (name) =>
                name.toUpperCase().includes("REFUNC") ||
                name.toUpperCase().includes("CONTROLE"),
            ) ?? workbook.SheetNames[0];

          const worksheet = workbook.Sheets[targetSheetName];
          if (!worksheet) {
            setValidationErrors(["Aba n\u00e3o encontrada no arquivo."]);
            return;
          }

          // 2. Converte para JSON com defval="" (nenhum campo vem undefined)
          const rows = XLSX.utils.sheet_to_json(worksheet, {
            defval: "",
          }) as RawRow[];

          if (rows.length === 0) {
            setValidationErrors([
              "A planilha est\u00e1 vazia ou n\u00e3o possui dados ap\u00f3s o cabe\u00e7alho.",
            ]);
            return;
          }

          // 3. Preview das 5 primeiras linhas processadas (sem enviar \u00e0 API)
          const preview = rows.slice(0, 5).map((row) => ({
            CPF: String(row["CPF"] ?? row["C.P.F."] ?? "").replace(/\D/g, ""),
            NOME: String(row["NOME"] ?? row["NOME COMPLETO"] ?? ""),
            STATUS: String(row["STATUS"] ?? ""),
            DATA_ADMISSAO: String(
              row["DATA ADMISS\u00c3O"] ?? row["DATA ADMISSAO"] ?? "",
            ),
          }));
          setPreviewData(preview);
          toast.success(
            `Planilha "${targetSheetName}" carregada! ${rows.length} registros encontrados.`,
          );

          // Guarda as rows no state para o handleImport usar sem re-processar
          setBufferedRows(rows);
        } catch (err) {
          console.error("Erro ao ler arquivo:", err);
          toast.error("Erro ao processar a planilha. Verifique o formato.");
          setFile(null);
        }
      };

      reader.readAsArrayBuffer(selectedFile);
    },
    [],
  );

  /**
   * Envia os dados para a API
   */
  const handleImport = useCallback(async () => {
    if (!file || validationErrors.length > 0 || !bufferedRows) return;

    setIsLoading(true);

    try {
      const report = await processImport(bufferedRows, () => {
        // Progresso opcional — pode conectar a uma barra no futuro
      });

      // Feedback detalhado via toasts
      if (report.erros.length === 0) {
        toast.success(
          `Importa\u00e7\u00e3o conclu\u00edda! ${report.inseridos} inseridos, ${report.atualizados} atualizados.`,
          { duration: 6000 },
        );
      } else {
        toast.warning(
          `Concluído com advertências: ${report.inseridos} inseridos, ${
            report.atualizados
          } atualizados, ${report.erros.length} erro(s).`,
          { duration: 8000 },
        );
        // Loga erros detalhados no console para debug
        console.group("[ImportModal] Erros de importação:");
        report.erros.forEach((e) =>
          console.warn(`Linha ${e.linha}: ${e.motivo}`),
        );
        console.groupEnd();

        // 🟢 SCRIPT DE EXTRAÇÃO DE ERROS PARA DEBUG
        try {
          const blob = new Blob([JSON.stringify(report.erros, null, 2)], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `erros_importacao_debug_${new Date().getTime()}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (downloadError) {
          console.error("Falha ao gerar o arquivo de download:", downloadError);
        }
      }

      // Limpa estado e fecha modal
      setFile(null);
      setPreviewData(null);
      setBufferedRows(null);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido.";
      toast.error(`Erro na importa\u00e7\u00e3o: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }, [file, validationErrors, bufferedRows, onOpenChange, onSuccess]);

  /**
   * Fecha o modal e limpa o estado
   */
  const handleClose = useCallback(() => {
    setFile(null);
    setPreviewData(null);
    setValidationErrors([]);
    setBufferedRows(null);
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Planilha XLSX
          </DialogTitle>
          <DialogDescription>
            Importe dados de colaboradores a partir de uma planilha Excel. O
            sistema fará upsert (atualiza existentes, insere novos) baseado no
            CPF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto flex-1 min-h-0">
          {/* Upload Area */}
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-muted/50 transition-colors">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
              disabled={isLoading}
            />
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center gap-3 cursor-pointer"
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {file ? file.name : "Clique para selecionar o arquivo XLSX"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  A planilha deve conter 38 colunas na ordem especificada
                </p>
              </div>
            </label>
          </div>

          {/* Erros de Validação */}
          {validationErrors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-destructive">
                    Erros de validação encontrados:
                  </h4>
                  <ul className="mt-2 text-xs text-destructive/80 space-y-1 max-h-40 overflow-y-auto">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Preview de Dados */}
          {previewData && previewData.length > 0 && (
            <div className="bg-muted/30 border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <h4 className="text-sm font-medium">
                  Preview (primeiros 5 registros):
                </h4>
              </div>
              <div className="overflow-x-auto max-h-[40vh] overflow-y-auto">
                <table className="w-full text-xs table-fixed">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">CPF</th>
                      <th className="text-left py-2 px-2">NOME</th>
                      <th className="text-left py-2 px-2">STATUS</th>
                      <th className="text-left py-2 px-2">DATA_ADMISSAO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, index) => (
                      <tr key={index} className="border-b border-border/50">
                        <td className="py-2 px-2 font-mono">
                          {row.CPF || "-"}
                        </td>
                        <td className="py-2 px-2 truncate max-w-[200px]" title={row.NOME || "-"}>{row.NOME || "-"}</td>
                        <td className="py-2 px-2">{row.STATUS || "-"}</td>
                        <td className="py-2 px-2">
                          {row.DATA_ADMISSAO || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || validationErrors.length > 0 || isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Importar Dados
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
