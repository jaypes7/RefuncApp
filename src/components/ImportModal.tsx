"use client";

import { useState, useCallback, useEffect } from "react";
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
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

import { processImport, type RawRow } from "@/services/import-service";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildHeaderMap } from "@/lib/import-utils";

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

// Interfaces do Relatório (adicionadas localmente para garantir a tipagem)
interface ImportError {
  linha: number;
  campo?: string;
  motivo: string;
}

interface ImportReport {
  inseridos: number;
  atualizados: number;
  ignorados: number;
  erros: ImportError[];
  total: number;
}

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

  /** 🟢 NOVO: Guarda o resultado final para mostrar na tela */
  const [importResult, setImportResult] = useState<ImportReport | null>(null);

  /** Controle de centro de custo quando ausente na planilha */
  const [precisaCentroCusto, setPrecisaCentroCusto] = useState(false);
  const [centrosDisponiveis, setCentrosDisponiveis] = useState<string[]>([]);
  const [centroCustoSelecionado, setCentroCustoSelecionado] = useState<string>("");

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
      setImportResult(null); // Limpa resultados anteriores

      const reader = new FileReader();

      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });

          const targetSheetName =
            workbook.SheetNames.find(
              (name) =>
                name.toUpperCase().includes("REFUNC") ||
                name.toUpperCase().includes("CONTROLE"),
            ) ?? workbook.SheetNames[0];

          const worksheet = workbook.Sheets[targetSheetName];
          if (!worksheet) {
            setValidationErrors(["Aba não encontrada no arquivo."]);
            return;
          }

          const rows = XLSX.utils.sheet_to_json(worksheet, {
            defval: "",
          }) as RawRow[];

          if (rows.length === 0) {
            setValidationErrors([
              "A planilha está vazia ou não possui dados após o cabeçalho.",
            ]);
            return;
          }

          const preview = rows.slice(0, 5).map((row) => ({
            CPF: String(row["CPF"] ?? row["C.P.F."] ?? "").replace(/\D/g, ""),
            NOME: String(row["NOME"] ?? row["NOME COMPLETO"] ?? ""),
            STATUS: String(row["STATUS"] ?? ""),
            DATA_ADMISSAO: String(
              row["DATA ADMISSÃO"] ?? row["DATA ADMISSAO"] ?? "",
            ),
          }));

          setPreviewData(preview);
          toast.success(
            `Planilha "${targetSheetName}" carregada! ${rows.length} registros encontrados.`,
          );

          setBufferedRows(rows);

          // Detecta se a planilha possui coluna de centro de custo
          const headerMap = buildHeaderMap(Object.keys(rows[0] ?? {}));
          const hasCc = Array.from(headerMap.values()).includes("c_custo");
          setPrecisaCentroCusto(!hasCc);
          if (hasCc) {
            setCentroCustoSelecionado("");
          }
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
      const report = await processImport(bufferedRows, {
        defaultCentroCusto: centroCustoSelecionado || undefined,
      });

      // 🟢 Seta o resultado para a tela mudar
      setImportResult(report);

      // 🟢 LIMPA o arquivo e o preview para a condição {!importResult} deixar de ser verdadeira
      setFile(null);
      setPreviewData(null);
      setBufferedRows(null);

      if (report.erros.length === 0) {
        toast.success(`Upload concluído!`);
      } else {
        toast.warning(`Concluído com ${report.erros.length} erro(s).`);
      }

      onSuccess?.();
      // ❌ REMOVIDO: onOpenChange(false) - Não fechamos mais o modal aqui!

    } catch (err: unknown) {
      // ... erro
    }
  }, [file, validationErrors, bufferedRows, onSuccess, centroCustoSelecionado]);

  useEffect(() => {
    if (precisaCentroCusto && centrosDisponiveis.length === 0) {
      fetch("/api/colaboradores/centros-custo")
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setCentrosDisponiveis(Array.isArray(data) ? data : []))
        .catch(() => setCentrosDisponiveis([]));
    }
  }, [precisaCentroCusto, centrosDisponiveis.length]);

  /**
   * Fecha o modal e limpa o estado
   */
  const handleClose = useCallback(() => {
    setFile(null);
    setPreviewData(null);
    setValidationErrors([]);
    setBufferedRows(null);
    setImportResult(null);
    setPrecisaCentroCusto(false);
    setCentroCustoSelecionado("");
    setCentrosDisponiveis([]);
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {importResult ? "Relatório de Upload" : "Fazer Upload de Planilha XLSX"}
          </DialogTitle>
          <DialogDescription>
            {importResult
              ? "Confira abaixo os resultados e eventuais erros do seu upload."
              : "Importe dados de colaboradores a partir de uma planilha Excel. O sistema fará upsert (atualiza existentes, insere novos) baseado no CPF."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto flex-1 min-h-0">

          {/* 🔀 CHAVEAMENTO DE TELAS: Se não tem resultado, mostra Upload. Se tem, mostra Relatório. */}
          {!importResult ? (
            <>
              {/* 1. ÁREA DE UPLOAD */}
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-muted/50 transition-colors">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
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
                    <Download className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {file ? file.name : "Clique para selecionar o arquivo XLSX/CSV"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 text-center">
                      O sistema identificará os cabeçalhos automaticamente.
                    </p>
                  </div>
                </label>
              </div>

              {/* 2. ERROS DE VALIDAÇÃO PRÉ-ENVIO */}
              {validationErrors.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <div className="flex items-start gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium">Erros no arquivo:</h4>
                      <ul className="mt-1 text-xs opacity-80 list-disc list-inside">
                        {validationErrors.map((error, i) => <li key={i}>{error}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. PREVIEW DAS LINHAS */}
              {previewData && previewData.length > 0 && (
                <div className="bg-muted/30 border rounded-lg p-4">
                  <h4 className="text-xs font-semibold mb-2 uppercase tracking-wider text-muted-foreground">
                    Preview dos dados encontrados:
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px] text-left">
                      <thead>
                        <tr className="border-b">
                          <th className="p-1">CPF</th>
                          <th className="p-1">NOME</th>
                          <th className="p-1 text-right">STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((row, i) => (
                          <tr key={i} className="border-b border-border/50 opacity-70">
                            <td className="p-1 font-mono">{row.CPF}</td>
                            <td className="p-1 truncate max-w-[120px]">{row.NOME}</td>
                            <td className="p-1 text-right">{row.STATUS}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 3.5 SELEÇÃO DE CENTRO DE CUSTO (quando ausente na planilha) */}
              {precisaCentroCusto && previewData && previewData.length > 0 && (
                <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-amber-900 mb-2">
                    Vincular dados à qual centro de custo?
                  </label>
                  <Select
                    value={centroCustoSelecionado || undefined}
                    onValueChange={setCentroCustoSelecionado}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Selecione um centro de custo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {centrosDisponiveis.map((cc) => (
                        <SelectItem key={cc} value={cc}>
                          {cc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {centrosDisponiveis.length === 0 && (
                    <p className="text-xs text-amber-700 mt-2">
                      Carregando centros de custo disponíveis...
                    </p>
                  )}
                </div>
              )}

              {/* 4. BOTÕES DE AÇÃO (TELA 1) */}
              <div className="flex justify-end gap-3 pt-4 border-t mt-auto">
                <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={
                    !file ||
                    isLoading ||
                    validationErrors.length > 0 ||
                    (precisaCentroCusto && !centroCustoSelecionado)
                  }
                >
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</>
                  ) : (
                    "Iniciar Upload"
                  )}
                </Button>
              </div>
            </>
          ) : (
            /* ============================================================ */
            /* TELA 2: RELATÓRIO DE RESULTADOS (Substitui a anterior)        */
            /* ============================================================ */
            <div className="flex flex-col gap-6 animate-in fade-in zoom-in duration-300">

              {/* Cards de Resumo */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                  <p className="text-[10px] uppercase text-green-600 font-bold">Novos</p>
                  <p className="text-2xl font-black text-green-700">{importResult.inseridos}</p>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                  <p className="text-[10px] uppercase text-blue-600 font-bold">Atualizados</p>
                  <p className="text-2xl font-black text-blue-700">{importResult.atualizados}</p>
                </div>
              </div>

              {/* Lista de Erros Detalhada */}
              {importResult.erros.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <h4 className="text-sm font-bold text-red-600 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Falhas encontradas ({importResult.erros.length}):
                  </h4>
                  <div className="bg-red-50 border border-red-100 rounded-lg overflow-hidden">
                    <div className="max-h-48 overflow-y-auto p-2 space-y-2">
                      {importResult.erros.map((erro, i) => (
                        <div key={i} className="text-xs text-red-900 border-b border-red-200/50 pb-2 last:border-0">
                          <span className="font-bold bg-red-200 px-1 rounded mr-2">Linha {erro.linha}</span>
                          {erro.motivo}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center bg-green-50 border border-green-100 rounded-lg">
                  <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-green-800">Tudo limpo! Upload 100% concluído.</p>
                </div>
              )}

              {/* Botão de Fechar (TELA 2) */}
              <div className="pt-4 border-t">
                <Button className="w-full" onClick={handleClose}>
                  Concluir e Voltar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}