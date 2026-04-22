"use client";

/**
 * ExportPdfButton
 * ─────────────────────────────────────────────────────────────────────────────
 * Botão reutilizável de exportação de elemento DOM para PDF.
 *
 * Usa html-to-image para capturar o conteúdo visual e jsPDF para gerar o arquivo.
 * Compatível com modo claro e escuro.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

interface ExportPdfButtonProps {
  targetRef: React.RefObject<HTMLElement | null>;
  filename?: string;
  label?: string;
  variant?: "outline" | "default" | "ghost" | "secondary" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function ExportPdfButton({
  targetRef,
  filename = "dashboard",
  label = "Exportar PDF",
  variant = "outline",
  size = "sm",
  className,
}: ExportPdfButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    const element = targetRef.current;
    if (!element) {
      toast.error("Elemento não encontrado para exportação.");
      return;
    }

    setIsExporting(true);
    try {
      const computedBg = window.getComputedStyle(element).backgroundColor || "transparent";

      const imgData = await toPng(element, {
        backgroundColor: computedBg,
        pixelRatio: 2,
        cacheBust: true,
      });

      const pdf = new jsPDF("landscape", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Cria uma imagem temporária para obter as dimensões reais
      const img = new Image();
      img.src = imgData;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Falha ao carregar imagem gerada."));
      });

      const imgWidth = img.naturalWidth;
      const imgHeight = img.naturalHeight;

      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const finalWidth = imgWidth * ratio;
      const finalHeight = imgHeight * ratio;

      const x = (pdfWidth - finalWidth) / 2;
      const y = (pdfHeight - finalHeight) / 2;

      pdf.addImage(imgData, "PNG", x, y, finalWidth, finalHeight);

      const dateStr = new Date().toISOString().split("T")[0];
      pdf.save(`${filename}_${dateStr}.pdf`);

      toast.success("PDF exportado com sucesso!");
    } catch (err) {
      console.error("[ExportPdfButton]", err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Erro ao exportar PDF. Tente novamente."
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
        <FileDown className="h-4 w-4" />
      )}
      {isExporting ? "Exportando..." : label}
    </Button>
  );
}
