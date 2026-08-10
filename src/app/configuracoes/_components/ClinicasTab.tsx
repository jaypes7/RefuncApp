"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Activity, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFilter } from "@/contexts/FilterContext";

type ConfigClinica = { id?: number; nome: string };

export function ClinicasTab() {
  const queryClient = useQueryClient();
  const { isReady: filterReady } = useFilter();

  // Clínicas - input para adicionar nova
  const [clinicaInput, setClinicaInput] = useState("");

  const { data: clinicasData } = useQuery<ConfigClinica[]>({
    queryKey: ["config", "clinicas"],
    queryFn: async () => {
      const res = await fetch("/api/config/clinicas");
      if (!res.ok) throw new Error("Falha ao carregar clínicas");
      return res.json();
    },
    enabled: filterReady,
  });

  const clinicas = clinicasData ?? [];

  const clinicaMutation = useMutation({
    mutationFn: async (nome: string) => {
      const res = await fetch("/api/config/clinicas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome }),
      });
      if (!res.ok) throw new Error("Falha ao salvar clínica");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "clinicas"], type: "all" });
      setClinicaInput("");
      toast.success("Clínica salva com sucesso!");
    },
    onError: () => toast.error("Erro ao salvar clínica"),
  });

  const deleteClinicaMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/config/clinicas?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Falha ao excluir clínica");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "clinicas"], type: "all" });
      toast.success("Clínica excluída com sucesso!");
    },
    onError: () => toast.error("Erro ao excluir clínica"),
  });

  return (
    <>
      <div>
        <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Gestão de Clínicas
        </h2>
        <p className="text-sm text-muted-foreground">
          Cadastre e gerencie as clínicas parceiras
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Lado Esquerdo - Formulário */}
        <div className="space-y-6">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider border-b pb-2">
            Nova Clínica
          </h3>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Nome da Clínica
            </label>
            <Input
              value={clinicaInput}
              onChange={(e) => setClinicaInput(e.target.value)}
              className="glass-input"
              placeholder="Nome da clínica"
            />
          </div>

          <Button
            onClick={() => clinicaMutation.mutate(clinicaInput)}
            disabled={
              !clinicaInput?.trim() || clinicaMutation.isPending
            }
            className="gap-2 w-full"
          >
            <Plus className="w-4 h-4" />
            Adicionar Clínica
          </Button>
        </div>

        {/* Lado Direito - Lista */}
        <div className="space-y-6">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider border-b pb-2">
            Clínicas Cadastradas
          </h3>

          <div className="space-y-2 max-h-100 overflow-y-auto">
            {clinicas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma clínica cadastrada</p>
              </div>
            ) : (
              <div className="space-y-2">
                {clinicas.map((clinica) => (
                  <div
                    key={clinica.id}
                    className="flex items-center justify-between p-3 bg-card/50 rounded-lg border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Activity className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-medium">
                        {clinica.nome}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        clinica.id &&
                        deleteClinicaMutation.mutate(clinica.id)
                      }
                      disabled={deleteClinicaMutation.isPending}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
