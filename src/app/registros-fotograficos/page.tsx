"use client";

import Image from "next/image";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Camera, Loader2, ImageIcon, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useFilter } from "@/contexts/FilterContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  registrosFotograficosApi,
  type RegistroFotografico,
} from "@/lib/axios";
import { RegistroFotograficoModal } from "./components/RegistroFotograficoModal";

// ============================================================================
// SUB-COMPONENTES
// ============================================================================

function RegistroCard({
  registro,
  onDelete,
  onEdit,
}: {
  registro: RegistroFotografico;
  onDelete: (id: string) => void;
  onEdit: (registro: RegistroFotografico) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate" title={registro.nome}>
              {registro.nome}
            </h3>
            {registro.descricao && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {registro.descricao}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(registro)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => onDelete(registro.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          {formatDate(registro.created_at)}
        </p>
      </div>

      {/* Galeria */}
      <div className="p-4 pt-2">
        {registro.urls.length === 1 ? (
          <div className="aspect-video rounded-lg overflow-hidden border bg-muted relative">
            <Image
              src={registro.urls[0]}
              alt={registro.nome}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover cursor-pointer hover:scale-105 transition-transform"
              onClick={() => setExpanded(true)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {registro.urls.slice(0, 4).map((url, idx) => (
              <div
                key={idx}
                className={`relative rounded-lg overflow-hidden border bg-muted ${
                  idx === 3 && registro.urls.length > 4 ? "group" : ""
                }`}
              >
                <Image
                  src={url}
                  alt={`${registro.nome} - ${idx + 1}`}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => setExpanded(true)}
                />
                {idx === 3 && registro.urls.length > 4 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold text-lg">
                    +{registro.urls.length - 4}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expanded viewer */}
      {expanded && (
        <Dialog open={expanded} onOpenChange={setExpanded}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{registro.nome}</DialogTitle>
              {registro.descricao && (
                <DialogDescription>{registro.descricao}</DialogDescription>
              )}
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {registro.urls.map((url, idx) => (
                <div
                  key={idx}
                  className="rounded-lg overflow-hidden border bg-muted relative"
                >
                  <Image
                    src={url}
                    alt={`${registro.nome} - ${idx + 1}`}
                    width={800}
                    height={600}
                    className="w-full object-contain max-h-[60vh] h-auto"
                  />
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="bg-muted rounded-full p-4 mb-4">
        <Camera className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">Nenhum registro fotográfico</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Adicione o primeiro conjunto de fotos vinculado a este centro de custo.
      </p>
      <Button onClick={onAdd}>
        <Plus className="mr-2 h-4 w-4" />
        Novo registro fotográfico
      </Button>
    </div>
  );
}

// ============================================================================
// PÁGINA PRINCIPAL
// ============================================================================

export default function RegistrosFotograficosPage() {
  const { centroCusto, isReady: filterReady } = useFilter();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editRegistro, setEditRegistro] = useState<RegistroFotografico | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["registros-fotograficos", centroCusto],
    queryFn: () => registrosFotograficosApi.listar(centroCusto).then((r) => r.data.data),
    enabled: filterReady && !!centroCusto,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => registrosFotograficosApi.remover(id),
    onSuccess: () => {
      toast.success("Registro removido com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["registros-fotograficos"], type: "all" });
      setDeleteId(null);
    },
    onError: (error: unknown) => {
      const e = error as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || "Erro ao remover registro");
    },
  });

  const registros = data ?? [];

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Registros Fotográficos
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {!filterReady
                ? "Carregando projeto..."
                : centroCusto
                ? `Visualizando fotos do centro de custo: ${centroCusto}`
                : "Selecione um centro de custo na sidebar para visualizar os registros."}
            </p>
          </div>
          {centroCusto && (
            <Button
              onClick={() => {
                setEditRegistro(null);
                setModalOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo registro
            </Button>
          )}
        </div>

        {/* Conteúdo */}
        {!filterReady ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl bg-card">
            <Loader2 className="h-10 w-10 text-muted-foreground mb-4 animate-spin" />
            <h3 className="text-lg font-semibold mb-1">
              Carregando projeto
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Aguarde enquanto o centro de custo ativo e carregado.
            </p>
          </div>
        ) : !centroCusto ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl bg-card">
            <ImageIcon className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">
              Centro de custo não selecionado
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Selecione um projeto na sidebar para visualizar os registros
              fotográficos vinculados.
            </p>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-card border rounded-xl overflow-hidden shadow-sm animate-pulse"
              >
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
                <div className="p-4 pt-0">
                  <div className="aspect-video bg-muted rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : registros.length === 0 ? (
          <EmptyState onAdd={() => setModalOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {registros.map((registro) => (
              <RegistroCard
                key={registro.id}
                registro={registro}
                onDelete={(id) => setDeleteId(id)}
                onEdit={(r) => {
                  setEditRegistro(r);
                  setModalOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de criação / edição */}
      <RegistroFotograficoModal
        key={editRegistro?.id ?? "create"}
        open={modalOpen}
        onOpenChange={(v) => {
          if (!v) setEditRegistro(null);
          setModalOpen(v);
        }}
        centroCusto={centroCusto}
        registro={editRegistro}
      />

      {/* Confirmação de exclusão */}
      <Dialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover este registro fotográfico? Esta ação
              não pode ser desfeita e as fotos serão excluídas permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
