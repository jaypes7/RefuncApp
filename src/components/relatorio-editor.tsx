"use client";

/**
 * RelatorioEditor
 * ─────────────────────────────────────────────────────────────────────────────
 * Editor rich text baseado em TipTap para edição do relatório executivo.
 * Suporta importação de Markdown (vindo da IA) e exportação do conteúdo
 * em HTML para geração de PDF.
 */

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Table as TableIcon,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";

interface RelatorioEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  className?: string;
  readOnly?: boolean;
  /** Ref para o container do conteúdo editável (sem toolbar). Usado para exportação PDF. */
  contentRef?: React.Ref<HTMLDivElement>;
}

export function RelatorioEditor({
  content = "",
  onChange,
  className,
  readOnly = false,
  contentRef,
}: RelatorioEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerContentRef = useRef<HTMLDivElement>(null);
  const lastContentRef = useRef<string>(content);

  // Forward ref para o container do conteúdo
  useEffect(() => {
    if (!contentRef) return;
    const ref = contentRef as React.MutableRefObject<HTMLDivElement | null>;
    ref.current = innerContentRef.current;
  }, [contentRef]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({
        placeholder: "O relatório gerado pela IA aparecerá aqui. Você pode editar livremente...",
      }),
      Markdown,
    ],
    content,
    editable: !readOnly,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  // Atualiza conteúdo quando a prop muda (ex: após gerar relatório)
  useEffect(() => {
    if (editor && content && content !== lastContentRef.current) {
      lastContentRef.current = content;
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) return null;

  const btn = (active: boolean, onClick: () => void, icon: React.ReactNode, title: string) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title={title}
      onClick={onClick}
      className={cn(
        "h-8 w-8 rounded-md",
        active && "bg-accent text-accent-foreground"
      )}
    >
      {icon}
    </Button>
  );

  return (
    <div ref={containerRef} className={cn("flex flex-col gap-2", className)}>
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-muted/50 p-1.5">
          {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), <Bold className="h-4 w-4" />, "Negrito")}
          {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), <Italic className="h-4 w-4" />, "Itálico")}
          {btn(editor.isActive("strike"), () => editor.chain().focus().toggleStrike().run(), <Strikethrough className="h-4 w-4" />, "Tachado")}
          <div className="mx-1 h-4 w-px bg-border" />
          {btn(editor.isActive("heading", { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), <Heading1 className="h-4 w-4" />, "Título 1")}
          {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <Heading2 className="h-4 w-4" />, "Título 2")}
          <div className="mx-1 h-4 w-px bg-border" />
          {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), <List className="h-4 w-4" />, "Lista")}
          {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered className="h-4 w-4" />, "Lista numerada")}
          {btn(editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), <Quote className="h-4 w-4" />, "Citação")}
          <div className="mx-1 h-4 w-px bg-border" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="Inserir tabela"
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            className="h-8 w-8 rounded-md"
          >
            <TableIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="Remover tabela"
            onClick={() => editor.chain().focus().deleteTable().run()}
            className="h-8 w-8 rounded-md"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <div className="mx-1 h-4 w-px bg-border" />
          {btn(false, () => editor.chain().focus().undo().run(), <Undo className="h-4 w-4" />, "Desfazer")}
          {btn(false, () => editor.chain().focus().redo().run(), <Redo className="h-4 w-4" />, "Refazer")}
        </div>
      )}

      <div
        ref={innerContentRef}
        className={cn(
          "min-h-[600px] rounded-lg border bg-background p-6 shadow-sm",
          "prose prose-sm max-w-none dark:prose-invert",
          "focus-within:ring-1 focus-within:ring-ring"
        )}
      >
        <EditorContent editor={editor} className="outline-none" />
      </div>
    </div>
  );
}
