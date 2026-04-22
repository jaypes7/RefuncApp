"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { bancoTalentosApi, type BancoTalento } from "@/lib/axios";

const Schema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  pessoa: z.string().max(50).optional().or(z.literal("")),
  cpf: z.string().max(14).optional().or(z.literal("")),
  dt_nasc: z.string().optional().or(z.literal("")),
  idade: z.string().optional().or(z.literal("")),
  municipio: z.string().max(255).optional().or(z.literal("")),
  uf: z.string().max(2).optional().or(z.literal("")),
  telefone: z.string().max(30).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof Schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  talento?: BancoTalento | null;
}

export function BancoTalentosAddEditModal({ open, onOpenChange, talento }: Props) {
  const isEdit = !!talento;
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      nome: "",
      pessoa: "",
      cpf: "",
      dt_nasc: "",
      idade: "",
      municipio: "",
      uf: "",
      telefone: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        nome: talento?.nome ?? "",
        pessoa: talento?.pessoa ?? "",
        cpf: talento?.cpf ?? "",
        dt_nasc: talento?.dt_nasc ?? "",
        idade: talento?.idade != null ? String(talento.idade) : "",
        municipio: talento?.municipio ?? "",
        uf: talento?.uf ?? "",
        telefone: talento?.telefone ?? "",
      });
    }
  }, [open, talento, reset]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        nome: values.nome,
        pessoa: values.pessoa || null,
        cpf: values.cpf || null,
        dt_nasc: values.dt_nasc || null,
        idade: values.idade ? parseInt(values.idade) : null,
        municipio: values.municipio || null,
        uf: values.uf || null,
        telefone: values.telefone || null,
      };

      if (isEdit && talento?.id) {
        await bancoTalentosApi.atualizar(talento.id, payload);
      } else {
        await bancoTalentosApi.criar(payload);
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Talento atualizado com sucesso!" : "Talento adicionado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["banco-talentos"] });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const e = error as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || "Erro ao salvar talento");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Colaborador" : "Novo Colaborador"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Atualize os dados do colaborador no banco de talentos." : "Preencha os dados para adicionar ao banco de talentos."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            {/* Nome */}
            <div className="col-span-2 space-y-1">
              <label htmlFor="bt-nome" className="text-sm font-medium">Nome <span className="text-destructive">*</span></label>
              <Input id="bt-nome" {...register("nome")} placeholder="Nome completo" />
              {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
            </div>

            {/* Pessoa / RE */}
            <div className="space-y-1">
              <label htmlFor="bt-pessoa" className="text-sm font-medium">Pessoa (RE)</label>
              <Input id="bt-pessoa" {...register("pessoa")} placeholder="ex: 496901" />
            </div>

            {/* CPF */}
            <div className="space-y-1">
              <label htmlFor="bt-cpf" className="text-sm font-medium">CPF</label>
              <Input id="bt-cpf" {...register("cpf")} placeholder="000.000.000-00" />
            </div>

            {/* Data de Nascimento */}
            <div className="space-y-1">
              <label htmlFor="bt-dt_nasc" className="text-sm font-medium">Data de Nascimento</label>
              <Input id="bt-dt_nasc" type="date" {...register("dt_nasc")} />
            </div>

            {/* Idade */}
            <div className="space-y-1">
              <label htmlFor="bt-idade" className="text-sm font-medium">Idade</label>
              <Input id="bt-idade" type="number" min={0} max={120} {...register("idade")} placeholder="ex: 35" />
            </div>

            {/* Município */}
            <div className="space-y-1">
              <label htmlFor="bt-municipio" className="text-sm font-medium">Município</label>
              <Input id="bt-municipio" {...register("municipio")} placeholder="Cidade" />
            </div>

            {/* UF */}
            <div className="space-y-1">
              <label htmlFor="bt-uf" className="text-sm font-medium">UF</label>
              <Input id="bt-uf" {...register("uf")} placeholder="ex: SP" maxLength={2} className="uppercase" />
            </div>

            {/* Telefone */}
            <div className="col-span-2 space-y-1">
              <label htmlFor="bt-telefone" className="text-sm font-medium">Telefone</label>
              <Input id="bt-telefone" {...register("telefone")} placeholder="(00) 00000-0000" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Salvar alterações" : "Adicionar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
