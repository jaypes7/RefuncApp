"use client";

import { useEffect, useMemo } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { IMaskInput } from "react-imask";
import { Loader2, Save, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CargoCombobox } from "./CargoCombobox";
import { colaboradoresApi, clinicasApi, type Colaborador } from "@/lib/axios";
import { maskCPF, formatTelefone } from "@/lib/utils";

const DATE_FIELDS = new Set(["DATA_ADMISSAO", "DT_NASCIMENTO"]);

/**
 * Normaliza qualquer representação de data para "YYYY-MM-DD" ou undefined.
 *
 * Formatos tratados:
 *  - Serial numérico do Excel/Sheets  → "37604"  ou  37604
 *  - Padrão brasileiro                → "DD/MM/YYYY"
 *  - ISO com timestamp                → "2024-01-08T00:00:00Z"
 *  - Já normalizado                   → "YYYY-MM-DD"
 *  - Vazio / null / undefined         → undefined
 */
function formatDataSegura(value: string | number | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const str = String(value).trim();
  if (str === "") return undefined;

  // Serial numérico do Excel (somente dígitos)
  if (/^\d+$/.test(str)) {
    const d = new Date((Number(str) - 25569) * 86400 * 1000);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // Padrão brasileiro DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [dd, mm, yyyy] = str.split("/");
    return `${yyyy}-${mm}-${dd}`;
  }

  // ISO ou qualquer outro formato — devolve só a parte da data
  return str.split("T")[0];
}

/**
 * Purifica o payload antes de enviar ao backend:
 *  - Strings vazias "" → undefined (evita falha no .enum() do Zod)
 *  - null → undefined  (Zod .partial() não aceita null em todos os campos)
 *  - Campos de data    → passam por formatDataSegura
 */
function sanitizePayload(data: EditFormData): Partial<EditFormData> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (DATE_FIELDS.has(key)) {
      const formatted = formatDataSegura(value as string | number | null | undefined);
      if (formatted !== undefined) result[key] = formatted;
      // data ausente → chave omitida por completo
      continue;
    }

    if (value === "" || value === null || value === undefined) {
      // Omite a chave — Zod .partial() trata ausência como opcional
      continue;
    }

    // Remove máscara do telefone antes de enviar
    if (key === "TELEFONE" && typeof value === "string") {
      result[key] = value.replace(/\D/g, "");
      continue;
    }

    result[key] = value;
  }

  return result as Partial<EditFormData>;
}

// Schema de validação para edição
const editSchema = z.object({
  // Dados Pessoais
  NOME: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  RE: z.string().optional().nullable(),
  IDADE: z.number().min(16).max(99).optional().nullable(),
  DT_NASCIMENTO: z.string().optional().nullable(),
  MUNICIPIO: z.string().optional().nullable(),
  UF: z.string().length(2).optional().nullable(),
  TELEFONE: z.string().optional().nullable(),
  PESSOA: z.enum(["Física", "Jurídica"]).optional().nullable(),
  SEXO: z.enum(["Masculino", "Feminino"]).optional().nullable(),
  IND: z.string().optional().nullable(),

  // Dados Contratuais
  DATA_ADMISSAO: z.string().optional().nullable(),
  FUNCAO_CLT: z.string().min(1, "Função é obrigatória"),
  HISTOGRAMA: z.string().optional().nullable(),
  CONTRATO: z
    .enum(["CLT", "PJ", "Temporário", "Estagiário"])
    .optional()
    .nullable(),
  STATUS: z
    .enum(["Ativo", "Pendente", "Inativo", "Desligado"])
    .optional()
    .nullable(),
  VINCULADO: z.string().optional().nullable(),

  // Sistemas
  PORTAL: z.enum(["Liberado", "Pendente", "Bloqueado"]).optional().nullable(),
  CRACHA: z.enum(["Emitido", "Pendente"]).optional().nullable(),
  PONTO: z.enum(["Cadastrado", "Pendente"]).optional().nullable(),

  // Mobilização
  MOB: z.string().optional().nullable(),
  PRE_ADMISSAO: z.enum(["Sim", "Não", "Pendente"]).optional().nullable(),
  OP: z.string().optional().nullable(),
  REQ: z.string().optional().nullable(),
  NUMERO_ORACLE: z.coerce.number().optional().nullable(),

  // Saúde
  EXAME: z.enum(["Realizado", "Agendado", "Pendente"]).optional().nullable(),
  ASO: z.enum(["Apto", "Inapto", "Pendente"]).optional().nullable(),
  CLINICA: z.string().optional().nullable(),
  RPV: z.string().optional().nullable(),

  // Documentação
  DOCS: z.enum(["Completo", "Pendente", "Incompleto"]).optional().nullable(),
  VR: z.enum(["Ativo", "Pendente"]).optional().nullable(),

  // Treinamento
  TREINAMENTO: z
    .enum(["Concluído", "Em Andamento", "Pendente"])
    .optional()
    .nullable(),
  REALIZAR_TREINAMENTO: z
    .enum(["Sim", "Não", "Pendente"])
    .optional()
    .nullable(),
  LOCAL_TREINAMENTO: z.string().optional().nullable(),
});

type EditFormData = z.infer<typeof editSchema>;

interface EditColaboradorModalProps {
  colaborador: Colaborador | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ufs = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

export function EditColaboradorModal({
  colaborador,
  open,
  onOpenChange,
}: EditColaboradorModalProps) {
  const queryClient = useQueryClient();

  // Busca clínicas
  const { data: clinicasData, isLoading: isLoadingClinicas } = useQuery({
    queryKey: ["clinicas"],
    queryFn: async () => {
      const response = await clinicasApi.listar();
      return response.data;
    },
  });

  const clinicas = useMemo(() => clinicasData || [], [clinicasData]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<EditFormData>({
    defaultValues: {
      NOME: "",
      RE: null,
      IDADE: null,
      FUNCAO_CLT: "",
      STATUS: "Pendente",
      PORTAL: "Pendente",
      CRACHA: "Pendente",
      PONTO: "Pendente",
      MOB: "Pendente",
      ASO: "Pendente",
      EXAME: "Pendente",
      DOCS: "Pendente",
      TREINAMENTO: "Pendente",
    },
  });

  // Preenche o formulário quando o colaborador muda.
  // Campos de enum recebem undefined quando o valor vindo da API for vazio/inválido,
  // evitando que o <Select> ou o Zod recebam strings que não pertencem ao enum.
  useEffect(() => {
    if (colaborador) {
      const safeEnum = <T extends string>(
        val: string | null | undefined,
        allowed: readonly T[],
      ): T | undefined =>
        allowed.includes(val as T) ? (val as T) : undefined;

      reset({
        NOME: colaborador.NOME || "",
        RE: colaborador.RE || "",
        IDADE: colaborador.IDADE || undefined,
        DT_NASCIMENTO: formatDataSegura(colaborador.DT_NASCIMENTO) ?? "",
        MUNICIPIO: colaborador.MUNICIPIO || "",
        UF: colaborador.UF || "",
        TELEFONE: colaborador.TELEFONE || "",
        PESSOA: safeEnum(colaborador.PESSOA, ["Física", "Jurídica"] as const),
        SEXO: safeEnum(colaborador.SEXO, ["Masculino", "Feminino"] as const),
        IND: colaborador.IND || "",
        DATA_ADMISSAO: formatDataSegura(colaborador.DATA_ADMISSAO) ?? "",
        FUNCAO_CLT: colaborador.FUNCAO_CLT || "",
        HISTOGRAMA: colaborador.HISTOGRAMA || "",
        NUMERO_ORACLE: colaborador.NUMERO_ORACLE ?? null,
        CONTRATO: safeEnum(colaborador.CONTRATO, ["CLT", "PJ", "Temporário", "Estagiário"] as const),
        STATUS: safeEnum(colaborador.STATUS, ["Ativo", "Pendente", "Inativo", "Desligado"] as const),
        VINCULADO: colaborador.VINCULADO || "",
        PORTAL: safeEnum(colaborador.PORTAL, ["Liberado", "Pendente", "Bloqueado"] as const),
        CRACHA: safeEnum(colaborador.CRACHA, ["Emitido", "Pendente"] as const),
        PONTO: safeEnum(colaborador.PONTO, ["Cadastrado", "Pendente"] as const),
        MOB: colaborador.MOB ?? null,
        PRE_ADMISSAO: safeEnum(colaborador.PRE_ADMISSAO, ["Sim", "Não", "Pendente"] as const),
        OP: colaborador.OP || "",
        REQ: colaborador.REQ || "",
        EXAME: safeEnum(colaborador.EXAME, ["Realizado", "Agendado", "Pendente"] as const),
        ASO: safeEnum(colaborador.ASO, ["Apto", "Inapto", "Pendente"] as const),
        CLINICA: colaborador.CLINICA || "",
        RPV: colaborador.RPV || "",
        DOCS: safeEnum(colaborador.DOCS, ["Completo", "Pendente", "Incompleto"] as const),
        VR: safeEnum(colaborador.VR, ["Ativo", "Pendente"] as const),
        TREINAMENTO: safeEnum(colaborador.TREINAMENTO, ["Concluído", "Em Andamento", "Pendente"] as const),
        REALIZAR_TREINAMENTO: safeEnum(colaborador.REALIZAR_TREINAMENTO, ["Sim", "Não", "Pendente"] as const),
        LOCAL_TREINAMENTO: colaborador.LOCAL_TREINAMENTO || "",
      });
    }
  }, [colaborador, reset]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<EditFormData>) => {
      if (!colaborador) throw new Error("Colaborador não selecionado");
      return colaboradoresApi.atualizar(colaborador.id || "", {
        ...data,
        CPF: colaborador.CPF,
      });
    },
    onSuccess: () => {
      toast.success("Colaborador atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["colaboradores"], type: "all" });
      onOpenChange(false);
    },
    onError: (error: {
      response?: { data?: { error?: string } };
      message?: string;
    }) => {
      const message =
        error.response?.data?.error ||
        error.message ||
        "Erro ao atualizar colaborador";
      toast.error(message);
      console.error("Erro ao atualizar:", error);
    },
  });

  const onSubmit = (data: EditFormData) => {
    updateMutation.mutate(sanitizePayload(data));
  };

  const funcaoValue = useWatch({ control, name: "FUNCAO_CLT" });
  const ufValue = useWatch({ control, name: "UF" });
  const statusValue = useWatch({ control, name: "STATUS" });
  const contratoValue = useWatch({ control, name: "CONTRATO" });
  const preAdmissaoValue = useWatch({ control, name: "PRE_ADMISSAO" });
  const docsValue = useWatch({ control, name: "DOCS" });
  const portalValue = useWatch({ control, name: "PORTAL" });
  const crachaValue = useWatch({ control, name: "CRACHA" });
  const pontoValue = useWatch({ control, name: "PONTO" });
  const mobValue = useWatch({ control, name: "MOB" });
  const vrValue = useWatch({ control, name: "VR" });
  const exameValue = useWatch({ control, name: "EXAME" });
  const asoValue = useWatch({ control, name: "ASO" });
  const clinicaValue = useWatch({ control, name: "CLINICA" });
  const treinamentoValue = useWatch({ control, name: "TREINAMENTO" });
  const realizarTreinamentoValue = useWatch({ control, name: "REALIZAR_TREINAMENTO" });

  const clinicaOptions = useMemo(
    () => [
      ...new Map(
        [
          clinicaValue ? { id: -1, nome: clinicaValue } : null,
          ...clinicas,
        ]
          .filter((clinica): clinica is { id: number; nome: string } => Boolean(clinica?.nome?.trim()))
          .map((clinica) => [clinica.nome, clinica]),
      ).values(),
    ],
    [clinicaValue, clinicas],
  );

  if (!colaborador) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Colaborador</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs defaultValue="pessoais" className="mt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pessoais">Pessoais</TabsTrigger>
              <TabsTrigger value="contratuais">Contratuais</TabsTrigger>
              <TabsTrigger value="sistemas">Sistemas</TabsTrigger>
              <TabsTrigger value="saude">Saúde</TabsTrigger>
            </TabsList>

            {/* Aba Dados Pessoais */}
            <TabsContent value="pessoais" className="space-y-4 py-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Nome Completo *</label>
                  <Input
                    {...register("NOME")}
                    className={errors.NOME ? "border-destructive" : ""}
                  />
                  {errors.NOME && (
                    <p className="text-xs text-destructive">
                      {errors.NOME.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">CPF</label>
                  <Input
                    value={maskCPF(colaborador.CPF)}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">RE</label>
                  <Input {...register("RE")} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Função CLT *</label>
                  <CargoCombobox
                    value={funcaoValue}
                    onChange={(value) =>
                      setValue("FUNCAO_CLT", value, { shouldValidate: true })
                    }
                    placeholder="Selecione o cargo..."
                  />
                  {errors.FUNCAO_CLT && (
                    <p className="text-xs text-destructive">
                      {errors.FUNCAO_CLT.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Histograma</label>
                  <Input {...register("HISTOGRAMA")} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Nº Oracle</label>
                  <Input {...register("NUMERO_ORACLE")} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Data de Nascimento
                  </label>
                  <Input type="date" {...register("DT_NASCIMENTO")} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Município</label>
                  <Input {...register("MUNICIPIO")} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">UF</label>
                  <Select
                    value={ufValue || undefined}
                    onValueChange={(v) => setValue("UF", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {ufs.map((uf) => (
                        <SelectItem key={uf} value={uf}>
                          {uf}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Telefone</label>
                  <Controller
                    name="TELEFONE"
                    control={control}
                    render={({ field }) => (
                      <IMaskInput
                        mask="(00) 00000-0000"
                        placeholder="(00) 00000-0000"
                        value={formatTelefone(field.value) || ""}
                        onAccept={(value: string) => field.onChange(value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    )}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Aba Dados Contratuais */}
            <TabsContent value="contratuais" className="space-y-4 py-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={statusValue || undefined}
                    onValueChange={(v) =>
                      setValue("STATUS", v as EditFormData["STATUS"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Inativo">Inativo</SelectItem>
                      <SelectItem value="Desligado">Desligado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Tipo de Contrato
                  </label>
                  <Select
                    value={contratoValue || undefined}
                    onValueChange={(v) =>
                      setValue("CONTRATO", v as EditFormData["CONTRATO"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CLT">CLT</SelectItem>
                      <SelectItem value="PJ">PJ</SelectItem>
                      <SelectItem value="Temporário">Temporário</SelectItem>
                      <SelectItem value="Estagiário">Estagiário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Data de Admissão
                  </label>
                  <Input type="date" {...register("DATA_ADMISSAO")} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Vinculado</label>
                  <Input {...register("VINCULADO")} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Pré-Admissão</label>
                  <Select
                    value={preAdmissaoValue || undefined}
                    onValueChange={(v) =>
                      setValue(
                        "PRE_ADMISSAO",
                        v as EditFormData["PRE_ADMISSAO"],
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sim">Sim</SelectItem>
                      <SelectItem value="Não">Não</SelectItem>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Documentação</label>
                  <Select
                    value={docsValue || undefined}
                    onValueChange={(v) =>
                      setValue("DOCS", v as EditFormData["DOCS"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Completo">Completo</SelectItem>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Incompleto">Incompleto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Aba Sistemas */}
            <TabsContent value="sistemas" className="space-y-4 py-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Portal</label>
                  <Select
                    value={portalValue || undefined}
                    onValueChange={(v) =>
                      setValue("PORTAL", v as EditFormData["PORTAL"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Liberado">Liberado</SelectItem>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Bloqueado">Bloqueado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Crachá</label>
                  <Select
                    value={crachaValue || undefined}
                    onValueChange={(v) =>
                      setValue("CRACHA", v as EditFormData["CRACHA"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Emitido">Emitido</SelectItem>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Ponto</label>
                  <Select
                    value={pontoValue || undefined}
                    onValueChange={(v) =>
                      setValue("PONTO", v as EditFormData["PONTO"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cadastrado">Cadastrado</SelectItem>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">MOB</label>
                  <Select
                    value={mobValue || undefined}
                    onValueChange={(v) =>
                      setValue("MOB", v as EditFormData["MOB"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sim">Sim</SelectItem>
                      <SelectItem value="Não">Não</SelectItem>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">OP</label>
                  <Input {...register("OP")} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">REQ</label>
                  <Input {...register("REQ")} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">VR</label>
                  <Select
                    value={vrValue === "Ativo" ? "Sim" : vrValue === "Pendente" ? "Não" : undefined}
                    onValueChange={(v) =>
                      setValue("VR", (v === "Sim" ? "Ativo" : "Pendente") as EditFormData["VR"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sim">Sim</SelectItem>
                      <SelectItem value="Não">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Aba Saúde */}
            <TabsContent value="saude" className="space-y-4 py-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Exame</label>
                  <Select
                    value={exameValue || undefined}
                    onValueChange={(v) =>
                      setValue("EXAME", v as EditFormData["EXAME"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Realizado">Realizado</SelectItem>
                      <SelectItem value="Agendado">Agendado</SelectItem>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">ASO</label>
                  <Select
                    value={asoValue || undefined}
                    onValueChange={(v) =>
                      setValue("ASO", v as EditFormData["ASO"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Apto">Apto</SelectItem>
                      <SelectItem value="Inapto">Inapto</SelectItem>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Clínica</label>
                  <Select
                    value={clinicaValue || undefined}
                    onValueChange={(v) => setValue("CLINICA", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {clinicaOptions.length === 0 ? (
                        <SelectItem value="__empty__" disabled>
                          {isLoadingClinicas ? "Carregando..." : "Nenhuma clínica cadastrada"}
                        </SelectItem>
                      ) : (
                        clinicaOptions.map((c) => (
                          <SelectItem key={c.id} value={c.nome}>
                            {c.nome}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">RPV</label>
                  <Input {...register("RPV")} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Treinamento</label>
                  <Select
                    value={treinamentoValue || undefined}
                    onValueChange={(v) =>
                      setValue("TREINAMENTO", v as EditFormData["TREINAMENTO"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Concluído">Concluído</SelectItem>
                      <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Realizar Treinamento
                  </label>
                  <Select
                    value={realizarTreinamentoValue || undefined}
                    onValueChange={(v) =>
                      setValue(
                        "REALIZAR_TREINAMENTO",
                        v as EditFormData["REALIZAR_TREINAMENTO"],
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sim">Sim</SelectItem>
                      <SelectItem value="Não">Não</SelectItem>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">
                    Local do Treinamento
                  </label>
                  <Input {...register("LOCAL_TREINAMENTO")} />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-6 flex justify-end gap-2 border-t pt-4">
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
              disabled={updateMutation.isPending || !isDirty}
            >
              {updateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
