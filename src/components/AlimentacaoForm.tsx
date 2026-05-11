"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, UtensilsCrossed } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { alimentacaoApi, type ColaboradorAlimentacao } from "@/lib/axios";

interface AlimentacaoFormProps {
  colaboradorId: string;
}

export function AlimentacaoForm({ colaboradorId }: AlimentacaoFormProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ColaboradorAlimentacao>({
    credito_vr_almoco: false,
    credito_vr_janta: false,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["alimentacao", colaboradorId],
    queryFn: async () => {
      const response = await alimentacaoApi.buscar(colaboradorId);
      return response.data.data;
    },
  });

  useEffect(() => {
    if (data) {
      setForm(data);
    }
  }, [data]);

  const atualizarMutation = useMutation({
    mutationFn: async (body: Partial<ColaboradorAlimentacao>) => {
      return alimentacaoApi.atualizar(colaboradorId, body);
    },
    onSuccess: () => {
      toast.success("Alimentação atualizada!");
      queryClient.invalidateQueries({ queryKey: ["alimentacao", colaboradorId] });
    },
    onError: () => {
      toast.error("Erro ao salvar");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <UtensilsCrossed className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Alimentação</h3>
          <p className="text-sm text-muted-foreground">Configuração de VR do colaborador</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Crédito VR Almoço</label>
          <p className="text-xs text-muted-foreground">O colaborador recebe VR para almoço?</p>
          <Select
            value={form.credito_vr_almoco === true ? "Sim" : form.credito_vr_almoco === false ? "Não" : undefined}
            onValueChange={(value) => {
              const checked = value === "Sim";
              setForm((prev) => ({ ...prev, credito_vr_almoco: checked }));
              atualizarMutation.mutate({ credito_vr_almoco: checked });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Sim">Sim</SelectItem>
              <SelectItem value="Não">Não</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Crédito VR Janta</label>
          <p className="text-xs text-muted-foreground">O colaborador recebe VR para jantar?</p>
          <Select
            value={form.credito_vr_janta === true ? "Sim" : form.credito_vr_janta === false ? "Não" : undefined}
            onValueChange={(value) => {
              const checked = value === "Sim";
              setForm((prev) => ({ ...prev, credito_vr_janta: checked }));
              atualizarMutation.mutate({ credito_vr_janta: checked });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Sim">Sim</SelectItem>
              <SelectItem value="Não">Não</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
