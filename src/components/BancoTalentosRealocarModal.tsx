"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Shuffle } from "lucide-react";
import { bancoTalentosApi, type BancoTalento } from "@/lib/axios";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  talento: BancoTalento | null;
  centrosDisponiveis: string[];
}

export function BancoTalentosRealocarModal({ open, onOpenChange, talento, centrosDisponiveis }: Props) {
  const [centroCusto, setCentroCusto] = useState<string>("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!talento?.id || !centroCusto) return;
      await bancoTalentosApi.realocar({ id: talento.id, novo_centro_custo: centroCusto });
    },
    onSuccess: () => {
      toast.success(`${talento?.nome} realocado para ${centroCusto} com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["colaboradores"], type: "all" });
      setCentroCusto("");
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const e = error as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || "Erro ao realocar colaborador");
    },
  });

  const handleClose = () => {
    setCentroCusto("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shuffle className="h-4 w-4" />
            Realocar para Central
          </DialogTitle>
          <DialogDescription>
            Copie <span className="font-medium text-foreground">{talento?.nome}</span> para a Central de Colaboradores vinculando a um centro de custo. O registro permanece no Banco de Talentos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Centro de custo destino</label>
            <Select value={centroCusto} onValueChange={setCentroCusto}>
              <SelectTrigger>
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
              <p className="text-xs text-muted-foreground">Nenhum centro de custo disponível.</p>
            )}
          </div>

          <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
            Os dados básicos (nome, CPF, pessoa, telefone, município) serão copiados para a central. Informações contratuais deverão ser preenchidas posteriormente.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t">
          <Button variant="outline" onClick={handleClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!centroCusto || mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Realocação
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
