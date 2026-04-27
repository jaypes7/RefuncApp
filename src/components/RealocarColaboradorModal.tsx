"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Shuffle, Loader2, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { colaboradoresApi, type Colaborador } from "@/lib/axios";

interface RealocarColaboradorModalProps {
  colaborador: Colaborador | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  centrosDisponiveis: string[];
}

export function RealocarColaboradorModal({
  colaborador,
  open,
  onOpenChange,
  centrosDisponiveis,
}: RealocarColaboradorModalProps) {
  const queryClient = useQueryClient();
  const [novoCentroCusto, setNovoCentroCusto] = useState<string>("");

  const realocarMutation = useMutation({
    mutationFn: async () => {
      if (!colaborador?.id || !novoCentroCusto) {
        throw new Error("Dados incompletos");
      }
      return colaboradoresApi.realocar({
        id: colaborador.id,
        novo_centro_custo: novoCentroCusto,
      });
    },
    onSuccess: () => {
      toast.success("Colaborador realocado com sucesso!");
      setNovoCentroCusto("");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["colaboradores"], type: "all" });
    },
    onError: (error: {
      response?: { data?: { error?: string } };
      message?: string;
    }) => {
      const message =
        error.response?.data?.error ||
        error.message ||
        "Erro ao realocar colaborador";
      toast.error(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    realocarMutation.mutate();
  };

  const opcoesFiltradas = centrosDisponiveis.filter(
    (cc) => cc !== colaborador?.CENTRO_CUSTO,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shuffle className="h-5 w-5" />
            Realocar Colaborador
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Duplicar o registro de{" "}
              <strong className="text-foreground">
                {colaborador?.NOME}
              </strong>{" "}
              para outro centro de custo.
            </p>
            <p className="text-xs text-muted-foreground">
              Serão mantidos: nome, CPF, tipo de pessoa, nº oracle e localização.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Novo Centro de Custo</label>
            <Select
              value={novoCentroCusto || undefined}
              onValueChange={setNovoCentroCusto}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o centro de custo..." />
              </SelectTrigger>
              <SelectContent>
                {opcoesFiltradas.map((cc) => (
                  <SelectItem key={cc} value={cc}>
                    {cc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={realocarMutation.isPending || !novoCentroCusto}
            >
              {realocarMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Shuffle className="mr-2 h-4 w-4" />
              )}
              Realocar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
