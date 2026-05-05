"use client";

/**
 * RelatorioExportPdf
 * ─────────────────────────────────────────────────────────────────────────────
 * Botão de exportação do conteúdo do editor de relatório para PDF.
 *
 * Usa html-to-image (toPng) + jsPDF. Para evitar erros de CORS com
 * stylesheets cross-origin (ex: Google Fonts), clona o elemento para
 * um container temporário e inlines os estilos computados antes da captura.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

interface RelatorioExportPdfProps {
  targetRef: React.RefObject<HTMLElement | null>;
  filename?: string;
  className?: string;
}

/**
 * Clona um elemento e seus filhos, inlining todos os estilos computados.
 * Isso evita que html-to-image precise acessar stylesheets cross-origin.
 */
function cloneWithInlineStyles(original: HTMLElement): HTMLElement {
  const clone = original.cloneNode(true) as HTMLElement;

  function copyStyles(src: Element, dst: Element) {
    const computed = window.getComputedStyle(src);
    const cssText = Array.from(computed).reduce((acc, prop) => {
      acc += `${prop}:${computed.getPropertyValue(prop)};`;
      return acc;
    }, "");
    (dst as HTMLElement).style.cssText = cssText;
  }

  function walk(src: Element, dst: Element) {
    copyStyles(src, dst);
    for (let i = 0; i < src.children.length; i++) {
      walk(src.children[i], dst.children[i]);
    }
  }

  walk(original, clone);
  return clone;
}

export function RelatorioExportPdf({
  targetRef,
  filename = "relatorio_executivo",
  className,
}: RelatorioExportPdfProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    const element = targetRef.current;
    if (!element) {
      toast.error("Conteúdo do relatório não encontrado para exportação.");
      return;
    }

    setIsExporting(true);

    // Container temporário fora da tela
    const tempContainer = document.createElement("div");
    tempContainer.style.position = "fixed";
    tempContainer.style.top = "-9999px";
    tempContainer.style.left = "-9999px";
    tempContainer.style.width = `${element.scrollWidth}px`;
    tempContainer.style.zIndex = "-1";
    document.body.appendChild(tempContainer);

    try {
      // Clona o elemento com estilos inline (evita CORS de stylesheets)
      const clone = cloneWithInlineStyles(element);
      // Garante fundo branco para o PDF
      clone.style.backgroundColor = "#ffffff";
      clone.style.color = "#000000";
      tempContainer.appendChild(clone);

      const imgData = await toPng(clone, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        cacheBust: true,
        skipFonts: true,
        width: element.scrollWidth,
        height: element.scrollHeight,
      });

      const pdf = new jsPDF("portrait", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const img = new Image();
      img.src = imgData;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Falha ao carregar imagem gerada."));
      });

      const imgWidth = img.naturalWidth;
      const imgHeight = img.naturalHeight;

      // Calcula quantas páginas são necessárias
      const contentHeightMm = (imgHeight / imgWidth) * pdfWidth;
      const totalPages = Math.ceil(contentHeightMm / (pdfHeight - 20));

      let position = 10; // margem superior inicial
      const margin = 10;
      const availableHeight = pdfHeight - margin * 2;

      // Se couber em uma página, centraliza verticalmente
      if (contentHeightMm <= availableHeight) {
        const ratio = Math.min(pdfWidth / imgWidth, availableHeight / imgHeight);
        const finalWidth = imgWidth * ratio;
        const finalHeight = imgHeight * ratio;
        const x = (pdfWidth - finalWidth) / 2;
        const y = margin + (availableHeight - finalHeight) / 2;
        pdf.addImage(imgData, "PNG", x, y, finalWidth, finalHeight);
      } else {
        // Multi-página: divide a imagem em fatias
        const ratio = pdfWidth / imgWidth;
        const sliceHeightPx = availableHeight / ratio;
        const canvas = document.createElement("canvas");
        canvas.width = imgWidth;
        canvas.height = Math.ceil(sliceHeightPx);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Não foi possível criar contexto de canvas");

        for (let page = 0; page < totalPages; page++) {
          if (page > 0) pdf.addPage();

          const srcY = page * sliceHeightPx;
          const remainingHeight = imgHeight - srcY;
          const currentSliceHeight = Math.min(sliceHeightPx, remainingHeight);

          canvas.height = Math.ceil(currentSliceHeight);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(
            img,
            0,
            srcY,
            imgWidth,
            currentSliceHeight,
            0,
            0,
            imgWidth,
            currentSliceHeight
          );

          const sliceData = canvas.toDataURL("image/png");
          const sliceHeightMm = currentSliceHeight * ratio;
          pdf.addImage(sliceData, "PNG", 0, margin, pdfWidth, sliceHeightMm);
        }
      }

      const dateStr = new Date().toISOString().split("T")[0];
      pdf.save(`${filename}_${dateStr}.pdf`);

      toast.success("PDF exportado com sucesso!");
    } catch (err) {
      console.error("[RelatorioExportPdf]", err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Erro ao exportar PDF. Tente novamente."
      );
    } finally {
      document.body.removeChild(tempContainer);
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      variant="outline"
      size="sm"
      className={`gap-2 ${className ?? ""}`}
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileUp className="h-4 w-4" />
      )}
      {isExporting ? "Exportando..." : "Exportar PDF"}
    </Button>
  );
}
