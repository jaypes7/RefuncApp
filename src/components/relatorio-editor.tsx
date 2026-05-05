"use client";

/**
 * RelatorioEditor
 * ─────────────────────────────────────────────────────────────────────────────
 * Editor rich text baseado em TipTap. NÃO-CONTROLADO após inicialização.
 *
 * O componente recebe `initialContent` apenas para montagem inicial.
 * Após isso, o TipTap gerencia o estado internamente.
 * O pai é notificado via `onChange`, mas NUNCA deve repassar o HTML
 * de volta como prop — isso evita o loop que joga o cursor pro final.
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
import { useEffect, useMemo, useRef } from "react";

export interface RelatorioEditorHandle {
  getHTML: () => string;
}

interface RelatorioEditorProps {
  initialContent?: string;
  onChange?: (html: string) => void;
  className?: string;
  readOnly?: boolean;
}

export function RelatorioEditor({
  initialContent = "",
  onChange,
  className,
  readOnly = false,
}: RelatorioEditorProps) {
  const hasInitialized = useRef(false);

  const extensions = useMemo(
    () => [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({
        placeholder: "O relatório gerado pela IA aparecerá aqui. Você pode editar livremente...",
      }),
      Markdown,
    ],
    []
  );

  const editor = useEditor({
    extensions,
    content: initialContent,
    editable: !readOnly,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      onChange?.(ed.getHTML());
    },
  });

  // Sincroniza conteúdo inicial APENAS UMA VEZ (na montagem)
  useEffect(() => {
    if (!editor || hasInitialized.current) return;
    if (initialContent && initialContent !== "") {
      editor.commands.setContent(initialContent, { emitUpdate: false });
    }
    hasInitialized.current = true;
  }, [editor, initialContent]);

  if (!editor) return null;

  const ToolbarButton = ({
    active,
    onClick,
    icon,
    title,
  }: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    title: string;
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={cn(
        "h-8 w-8 rounded-md",
        active && "bg-accent text-accent-foreground"
      )}
    >
      {icon}
    </Button>
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-muted/50 p-1.5 select-none">
          <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} icon={<Bold className="h-4 w-4" />} title="Negrito" />
          <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} icon={<Italic className="h-4 w-4" />} title="Itálico" />
          <ToolbarButton active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} icon={<Strikethrough className="h-4 w-4" />} title="Tachado" />
          <div className="mx-1 h-4 w-px bg-border" />
          <ToolbarButton active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} icon={<Heading1 className="h-4 w-4" />} title="Título 1" />
          <ToolbarButton active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} icon={<Heading2 className="h-4 w-4" />} title="Título 2" />
          <div className="mx-1 h-4 w-px bg-border" />
          <ToolbarButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} icon={<List className="h-4 w-4" />} title="Lista" />
          <ToolbarButton active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} icon={<ListOrdered className="h-4 w-4" />} title="Lista numerada" />
          <ToolbarButton active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} icon={<Quote className="h-4 w-4" />} title="Citação" />
          <div className="mx-1 h-4 w-px bg-border" />
          <ToolbarButton active={false} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} icon={<TableIcon className="h-4 w-4" />} title="Inserir tabela" />
          <ToolbarButton active={false} onClick={() => editor.chain().focus().deleteTable().run()} icon={<Trash2 className="h-4 w-4" />} title="Remover tabela" />
          <div className="mx-1 h-4 w-px bg-border" />
          <ToolbarButton active={false} onClick={() => editor.chain().focus().undo().run()} icon={<Undo className="h-4 w-4" />} title="Desfazer" />
          <ToolbarButton active={false} onClick={() => editor.chain().focus().redo().run()} icon={<Redo className="h-4 w-4" />} title="Refazer" />
        </div>
      )}

      <div className="min-h-[400px] rounded-lg border bg-background p-6 shadow-sm focus-within:ring-1 focus-within:ring-ring">
        <EditorContent editor={editor} className="tiptap-editor outline-none" />
      </div>
    </div>
  );
}
