"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Package, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CategoriasSupTab() {
  const queryClient = useQueryClient();

  // Categorias SUP.
  const [categoriaNome, setCategoriaNome] = useState("");

  const { data: categoriasData } = useQuery<{ id: string; nome: string }[]>({
    queryKey: ["suprimentos-categorias"],
    queryFn: async () => {
      const res = await fetch("/api/suprimentos/categorias");
      if (!res.ok) throw new Error("Falha ao carregar categorias");
      return res.json();
    },
  });

  const addCategoriaMutation = useMutation({
    mutationFn: async (nome: string) => {
      const res = await fetch("/api/suprimentos/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Falha ao salvar categoria");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suprimentos-categorias"], type: "all" });
      setCategoriaNome("");
      toast.success("Categoria adicionada!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteCategoriaMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/suprimentos/categorias?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Falha ao remover categoria");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suprimentos-categorias"], type: "all" });
      toast.success("Categoria removida!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <>
      <div>
        <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Categorias de Suprimentos
        </h2>
        <p className="text-sm text-muted-foreground">
          Gerencie as categorias disponíveis na criação de requisições
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Lado Esquerdo - Formulário */}
        <div className="space-y-6">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider border-b pb-2">
            Nova Categoria
          </h3>
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome da Categoria</label>
            <Input
              value={categoriaNome}
              onChange={(e) => setCategoriaNome(e.target.value)}
              className="glass-input"
              placeholder="Ex: MAT. ELÉTRICO"
              onKeyDown={(e) => {
                if (e.key === "Enter" && categoriaNome.trim()) {
                  addCategoriaMutation.mutate(categoriaNome.trim());
                }
              }}
            />
          </div>
          <Button
            onClick={() => addCategoriaMutation.mutate(categoriaNome.trim())}
            disabled={!categoriaNome?.trim() || addCategoriaMutation.isPending}
            className="gap-2 w-full"
          >
            <Plus className="w-4 h-4" />
            Adicionar Categoria
          </Button>
        </div>

        {/* Lado Direito - Lista */}
        <div className="space-y-6">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider border-b pb-2">
            Categorias Cadastradas ({(categoriasData ?? []).length})
          </h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {(categoriasData ?? []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma categoria cadastrada</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(categoriasData ?? []).map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3 bg-card/50 rounded-lg border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                        <Package className="w-4 h-4 text-orange-500" />
                      </div>
                      <span className="font-medium">{cat.nome}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCategoriaMutation.mutate(cat.id)}
                      disabled={deleteCategoriaMutation.isPending}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
