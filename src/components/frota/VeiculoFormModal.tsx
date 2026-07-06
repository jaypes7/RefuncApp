"use client";

import { useEffect } from "react";
import { useForm, Controller, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { frotaApi, type FrotaVeiculo } from "@/lib/axios";
import {
  VEICULO_TIPOS,
  VEICULO_STATUS,
  VEICULO_ACOES,
  COMBUSTIVEIS,
  MODALIDADES,
  TIPOS_CONTRATO,
  apiErrorMessage,
} from "@/components/frota/frota-utils";

const opt = z.string().optional().or(z.literal(""));

const Schema = z.object({
  placa: z.string().min(1, "Placa é obrigatória").max(10),
  marca: opt,
  modelo: opt,
  tipo: opt,
  ano_fabricacao: opt,
  combustivel: opt,
  chave_reserva: opt,
  status: opt,
  acao: opt,
  renavam: opt,
  crv: opt,
  uf: opt,
  exercicio_crlv: opt,
  cnpj_proprietario: opt,
  gestor: opt,
  local_trabalho: opt,
  centro_custo: opt,
  ut_atual: opt,
  condutor_nome: opt,
  condutor_re: opt,
  telefone: opt,
  propriedade: opt,
  modalidade: opt,
  tipo_contrato: opt,
  valor_locacao: opt,
  rastreador: opt,
  aplicacao_devolucao: opt,
  data_aplicacao: opt,
  observacoes: opt,
});

type FormValues = z.infer<typeof Schema>;

const EMPTY: FormValues = {
  placa: "", marca: "", modelo: "", tipo: "", ano_fabricacao: "", combustivel: "",
  chave_reserva: "", status: "ATIVO", acao: "", renavam: "", crv: "", uf: "",
  exercicio_crlv: "", cnpj_proprietario: "", gestor: "", local_trabalho: "",
  centro_custo: "", ut_atual: "", condutor_nome: "", condutor_re: "", telefone: "",
  propriedade: "", modalidade: "", tipo_contrato: "", valor_locacao: "",
  rastreador: "", aplicacao_devolucao: "", data_aplicacao: "", observacoes: "",
};

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SelectField({
  control, name, label, options, placeholder,
}: {
  control: Control<FormValues>;
  name: keyof FormValues;
  label: string;
  options: string[];
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select value={field.value || ""} onValueChange={field.onChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={placeholder ?? "Selecione"} />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </Field>
  );
}

function Section({ title }: { title: string }) {
  return (
    <p className="col-span-2 mt-2 border-b pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground first:mt-0">
      {title}
    </p>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculo?: FrotaVeiculo | null;
}

export function VeiculoFormModal({ open, onOpenChange, veiculo }: Props) {
  const isEdit = !!veiculo;
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (open) {
      reset({
        ...EMPTY,
        ...(veiculo
          ? Object.fromEntries(
              Object.keys(EMPTY).map((k) => {
                const v = veiculo[k as keyof FrotaVeiculo];
                if (k === "data_aplicacao" && typeof v === "string") return [k, v.split("T")[0]];
                return [k, v == null ? "" : String(v)];
              }),
            )
          : {}),
      });
    }
  }, [open, veiculo, reset]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: Partial<FrotaVeiculo> = {};
      for (const [key, raw] of Object.entries(values)) {
        if (key === "placa") continue;
        if (key === "valor_locacao") {
          payload.valor_locacao = raw ? parseFloat(String(raw).replace(",", ".")) || null : null;
        } else {
          (payload as Record<string, unknown>)[key] = raw || null;
        }
      }
      payload.placa = values.placa;

      if (isEdit && veiculo?.id) {
        await frotaApi.veiculos.atualizar(veiculo.id, payload);
      } else {
        await frotaApi.veiculos.criar(payload);
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Veículo atualizado com sucesso!" : "Veículo cadastrado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["frota-veiculos"], type: "all" });
      queryClient.invalidateQueries({ queryKey: ["frota-dashboard"], type: "all" });
      onOpenChange(false);
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Erro ao salvar veículo")),
  });

  const textField = (
    name: keyof FormValues,
    label: string,
    props?: React.ComponentProps<typeof Input>,
    reg?: UseFormRegister<FormValues>,
    errs?: FieldErrors<FormValues>,
  ) => (
    <Field label={label} error={(errs ?? errors)[name]?.message}>
      <Input {...(reg ?? register)(name)} {...props} />
    </Field>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Editar Veículo — ${veiculo?.placa}` : "Novo Veículo"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Atualize os dados do veículo da frota." : "Preencha os dados para cadastrar o veículo na frota."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="grid grid-cols-2 gap-4 pt-2">
          <Section title="Identificação" />
          {textField("placa", "Placa *", { placeholder: "AAA0A00", className: "uppercase" })}
          {textField("marca", "Marca")}
          {textField("modelo", "Modelo")}
          <SelectField control={control} name="tipo" label="Tipo" options={VEICULO_TIPOS} />
          {textField("ano_fabricacao", "Ano fabricação")}
          <SelectField control={control} name="combustivel" label="Combustível" options={COMBUSTIVEIS} />
          <SelectField control={control} name="chave_reserva" label="Chave reserva" options={["SIM", "NÃO"]} />
          <SelectField control={control} name="status" label="Status" options={VEICULO_STATUS} />
          <SelectField control={control} name="acao" label="Ação" options={VEICULO_ACOES} />

          <Section title="Documentação" />
          {textField("renavam", "RENAVAM")}
          {textField("crv", "CRV")}
          {textField("uf", "UF", { maxLength: 2, className: "uppercase" })}
          {textField("exercicio_crlv", "Exercício CRLV")}
          {textField("cnpj_proprietario", "CNPJ proprietário")}

          <Section title="Alocação" />
          {textField("gestor", "Gestor / Matricial")}
          {textField("local_trabalho", "Local de trabalho")}
          {textField("centro_custo", "Centro de custo")}
          {textField("ut_atual", "UT atual")}
          {textField("condutor_nome", "Condutor")}
          {textField("condutor_re", "RE do condutor")}
          {textField("telefone", "Telefone")}

          <Section title="Contrato" />
          {textField("propriedade", "Propriedade / Locadora")}
          <SelectField control={control} name="modalidade" label="Modalidade" options={MODALIDADES} />
          <SelectField control={control} name="tipo_contrato" label="Tipo de contrato" options={TIPOS_CONTRATO} />
          {textField("valor_locacao", "Valor locação (R$)", { placeholder: "0,00" })}
          {textField("rastreador", "Rastreador", { placeholder: "CEABS, POINTER..." })}

          <Section title="Mobilização" />
          {textField("aplicacao_devolucao", "Aplicação / Devolução")}
          {textField("data_aplicacao", "Data aplicação", { type: "date" })}

          <div className="col-span-2 space-y-1">
            <label className="text-sm font-medium">Observações</label>
            <Textarea rows={2} {...register("observacoes")} />
          </div>

          <div className="col-span-2 flex justify-end gap-3 border-t pt-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Salvar alterações" : "Cadastrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
