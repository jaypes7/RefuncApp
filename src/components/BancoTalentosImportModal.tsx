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
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { bancoTalentosApi } from "@/lib/axios";
import { buildHeaderMap } from "@/lib/import-utils";
import { maskCPF } from "@/lib/utils";

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ImportReport {
  inseridos: number;
  atualizados: number;
  ignorados: number;
  erros: Array<{ linha: number; motivo: string }>;
  total: number;
}

type RawRow = Record<string, unknown>;

interface PreviewRow {
  cpf: string;
  nome: string;
  municipio: string;
}

function getBySchema(row: RawRow, headerMap: Map<string, string>, schemaId: string): unknown {
  for (const [header, schema] of headerMap.entries()) {
    if (schema === schemaId) return row[header];
  }
  return undefined;
}

export function BancoTalentosImportModal({ open, onOpenChange, onSuccess }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewRow[] | null>(null);
  const [bufferedRows, setBufferedRows] = useState<RawRow[] | null>(null);
  const [importResult, setImportResult] = useState<ImportReport | null>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setPreviewData(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        if (!worksheet) {
          toast.error("Aba não encontrada no arquivo.");
          return;
        }

        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as RawRow[];

        if (rows.length === 0) {
          toast.error("A planilha está vazia.");
          return;
        }

        const headerMap = buildHeaderMap(Object.keys(rows[0] ?? {}));
        const preview = rows.slice(0, 5).map((row) => ({
          cpf: String(getBySchema(row, headerMap, "cpf") ?? "").replace(/\D/g, ""),
          nome: String(getBySchema(row, headerMap, "nome") ?? ""),
          municipio: String(getBySchema(row, headerMap, "municipio") ?? ""),
        }));

        setPreviewData(preview);
        setBufferedRows(rows);
        toast.success(`Planilha carregada! ${rows.length} registros encontrados.`);
      } catch {
        toast.error("Erro ao processar a planilha. Verifique o formato.");
        setFile(null);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  }, []);

  const handleImport = useCallback(async () => {
    if (!file || !bufferedRows) return;
    setIsLoading(true);
    try {
      const response = await bancoTalentosApi.importar({ rows: bufferedRows });
      const report = response.data as ImportReport;

      setImportResult(report);
      setFile(null);
      setPreviewData(null);
      setBufferedRows(null);

      if (report.erros.length === 0) {
        toast.success("Upload concluído com sucesso!");
      } else {
        toast.warning(`Concluído com ${report.erros.length} erro(s).`);
      }
      onSuccess?.();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      const msg = e.response?.data?.error ?? "Erro ao fazer upload da planilha.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [file, bufferedRows, onSuccess]);

  const handleClose = useCallback(() => {
    setFile(null);
    setPreviewData(null);
    setBufferedRows(null);
    setImportResult(null);
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {importResult ? "Relatório de Upload" : "Fazer Upload de Planilha — Banco de Talentos"}
          </DialogTitle>
          <DialogDescription>
            {importResult
              ? "Confira abaixo os resultados do seu upload."
              : "Importe colaboradores a partir de uma planilha Excel (modelo: PESSOA, NOME, IDADE, DT NASC, CPF, MUNICÍPIO, UF, TELEFONE)."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto flex-1 min-h-0">
          {!importResult ? (
            <>
              {/* Upload area */}
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-muted/50 transition-colors">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="bt-file-upload"
                  disabled={isLoading}
                />
                <label htmlFor="bt-file-upload" className="flex flex-col items-center gap-3 cursor-pointer">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Download className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {file ? file.name : "Clique para selecionar o arquivo XLSX/CSV"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Os cabeçalhos serão identificados automaticamente.
                    </p>
                  </div>
                </label>
              </div>

              {/* Preview */}
              {previewData && previewData.length > 0 && (
                <div className="bg-muted/30 border rounded-lg p-4">
                  <h4 className="text-xs font-semibold mb-2 uppercase tracking-wider text-muted-foreground">
                    Preview dos primeiros registros:
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px] text-left">
                      <thead>
                        <tr className="border-b">
                          <th className="p-1">CPF</th>
                          <th className="p-1">NOME</th>
                          <th className="p-1">MUNICÍPIO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((row, i) => (
                          <tr key={i} className="border-b border-border/50 opacity-70">
                            <td className="p-1 font-mono">{maskCPF(row.cpf) || "—"}</td>
                            <td className="p-1 truncate max-w-[140px]">{row.nome}</td>
                            <td className="p-1">{row.municipio}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                  Cancelar
                </Button>
                <Button onClick={handleImport} disabled={!file || isLoading}>
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processando...</>
                  ) : (
                    "Iniciar Upload"
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-6 animate-in fade-in zoom-in duration-300">
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

              {importResult.erros.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <h4 className="text-sm font-bold text-red-600 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Falhas ({importResult.erros.length}):
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
                  <p className="text-sm font-medium text-green-800">Upload 100% concluído sem erros.</p>
                </div>
              )}

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
