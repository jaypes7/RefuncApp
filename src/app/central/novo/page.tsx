"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useForm, Controller } from "react-hook-form";

import { z } from "zod";
import {
  Briefcase,
  ShieldCheck,
  Truck,
  ClipboardList,
  Loader2,
  AlertCircle,
  CheckCircle,
  Activity,
  CalendarCheck,
  GraduationCap,
} from "lucide-react";
import { IMaskInput } from "react-imask";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useFilter } from "@/contexts/FilterContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { colaboradoresApi, clinicasApi, treinamentosApi } from "@/lib/axios";
import { CargoCombobox } from "@/components/CargoCombobox";
import { TreinamentosSelecao, type TreinamentoSelecionado } from "@/components/TreinamentosSelecao";
import { ESCOLARIDADE_OPTIONS, EXPERIENCIA_FUNCAO_OPTIONS } from "@/constants/rh-profile";

// ============================================================================
// FUNÇÃO DEBOUNCE
// ============================================================================
function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  delay: number
) {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// ============================================================================
// SCHEMA DE VALIDAÇÃO ZOD
// ============================================================================

const fullSchema = z.object({
  cpf: z.string().min(14, "CPF inválido"),
  nome: z.string().min(3, "Nome completo é obrigatório"),
  centroCusto: z.string().min(1, "Centro de custo é obrigatório"),
  dtNascimento: z.string().optional(),
  idade: z.number().min(16).max(99).optional(),
  municipio: z.string().optional(),
  telefone: z.string().optional(),
  uf: z.string().optional(),
  sexo: z.enum(["Masculino", "Feminino"]).optional(),
  ind: z.string().optional(),
  dataAdmissao: z.string().optional(),
  re: z.string().optional(),
  funcaoClt: z.string().optional(),
  histograma: z.string().optional(),
  numeroOracle: z.coerce.number().optional().nullable(),
  escolaridade: z.enum(ESCOLARIDADE_OPTIONS).optional(),
  experienciaFuncao: z.enum(EXPERIENCIA_FUNCAO_OPTIONS).optional(),
  cartaOferta: z.enum(["Sim", "Não", "Pendente"]).optional(),
  tipoContrato: z.enum(["Determinado", "Indeterminado"]).optional(),
  contrato: z.enum(["CLT", "PJ", "Temporário", "Estagiário"]).optional(),
  status: z.enum(["Ativo", "Pendente", "Inativo", "Desligado"]).optional(),
  enviadoRh: z.enum(["Sim", "Não", "Pendente"]).optional(),
  vinculado: z.string().optional(),
  termino: z.string().optional(),
  prorrogacao: z.string().optional(),
  demissao: z.string().optional(),
  preAdmissao: z.enum(["Sim", "Não", "Pendente"]).optional(),
  docs: z.enum(["Completo", "Pendente", "Incompleto"]).optional(),
  cracha: z.enum(["Emitido", "Pendente"]).optional(),
  ponto: z.enum(["Cadastrado", "Pendente"]).optional(),
  vr: z.enum(["Ativo", "Pendente"]).optional(),
  mob: z.enum(["Sim", "Não", "Pendente"]).optional(),
  op: z.string().optional(),
  req: z.string().optional(),
  colabPend: z.enum(["Sim", "Não"]).optional(),
  portal: z.enum(["Liberado", "Pendente", "Bloqueado"]).optional(),
  exame: z.enum(["Realizado", "Agendado", "Pendente"]).optional(),
  aso: z.enum(["Apto", "Inapto", "Pendente"]).optional(),
  clinica: z.string().optional(),
  rpv: z.string().optional(),
});

type FullFormData = z.infer<typeof fullSchema>;

// ============================================================================
// LISTA DE UF DO BRASIL
// ============================================================================

const ufs = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

// Calcular idade baseado na data de nascimento
function calcularIdade(dataNascimento: string | undefined): number | undefined {
  if (!dataNascimento) return undefined;
  const hoje = new Date();
  const nascimento = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }
  return idade >= 16 && idade <= 99 ? idade : undefined;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function OnboardingPage() {
  const queryClient = useQueryClient();
  const [showSuccess, setShowSuccess] = useState(false);
  const [cpfChecking, setCpfChecking] = useState(false);
  const [cpfError, setCpfError] = useState<string | null>(null);
  const cpfBeingChecked = useRef<string | null>(null);
  const router = useRouter();
  const { centroCusto, isReady: filterReady } = useFilter();
  const [treinamentosSelecionados, setTreinamentosSelecionados] = useState<TreinamentoSelecionado[]>([]);

  const invalidateColaboradorCaches = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["colaboradores"], type: "all" }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-principal"], type: "all" }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-rh"], type: "all" }),
    ]);
  };

  // Busca clínicas da API
  const { data: clinicasData, isLoading: isLoadingClinicas } = useQuery({
    queryKey: ["clinicas"],
    queryFn: async () => {
      const response = await clinicasApi.listar();
      return response.data;
    },
    enabled: filterReady,
  });

  const clinicas = clinicasData || [];

  // Busca projetos cadastrados para o dropdown de centro de custo
  const { data: projetosData } = useQuery({
    queryKey: ["projetos"],
    queryFn: async () => {
      const response = await fetch("/api/projetos");
      if (!response.ok) return [];
      const json = (await response.json()) as { data?: Array<{ centro_custo: string }> };
      return json.data ?? [];
    },
    select: (data) => data.map((p) => p.centro_custo).filter(Boolean),
    enabled: filterReady,
  });

  const projetos = projetosData ?? [];

  // Helper para montar payload da API
  const buildColaboradorPayload = (data: FullFormData) => {
    return {
      IND: data.ind,
      STATUS: data.status || "Pendente",
      ENVIADO_RH: data.enviadoRh,
      SEXO: data.sexo,
      REQ: data.req,
      VINCULADO: data.vinculado,
      CARTA_OFERTA: data.cartaOferta,
      COLAB_PEND: data.colabPend,
      EXAME: data.exame,
      CLINICA: data.clinica,
      DOCS: data.docs,
      ASO: data.aso,
      RPV: data.rpv,
      PRE_ADMISSAO: data.preAdmissao,
      MOB: data.mob,
      OP: data.op,
      TIPO_CONTRATO: data.tipoContrato,
      DATA_ADMISSAO: data.dataAdmissao,
      CONTRATO: data.contrato,
      PORTAL: data.portal,
      CRACHA: data.cracha,
      PONTO: data.ponto,
      TREINAMENTO: "Pendente",
      REALIZAR_TREINAMENTO: "Sim",
      LOCAL_TREINAMENTO: "",
      RE: data.re,
      NOME: data.nome,
      FUNCAO_CLT: data.funcaoClt,
      HISTOGRAMA: data.histograma,
      NUMERO_ORACLE: data.numeroOracle ?? null,
      ESCOLARIDADE: data.escolaridade,
      EXPERIENCIA_FUNCAO: data.experienciaFuncao,
      IDADE: data.idade,
      DT_NASCIMENTO: data.dtNascimento,
      CPF: data.cpf.replace(/\D/g, ""),
      VR: data.vr,
      TERMINO: data.termino || null,
      PRORROGACAO: data.prorrogacao || null,
      DEMISSAO: data.demissao || null,
      MUNICIPIO: data.municipio,
      UF: data.uf,
      TELEFONE: data.telefone ? data.telefone.replace(/\D/g, "") : undefined,
      CENTRO_CUSTO: data.centroCusto || centroCusto,
    };
  };

  // Mutação para criar colaborador
  const createMutation = useMutation({
    mutationFn: async (data: FullFormData) => {
      const colaborador = buildColaboradorPayload(data);
      return colaboradoresApi.criar(colaborador);
    },
    onSuccess: async () => {
      toast.success("Colaborador cadastrado com sucesso!");
      await invalidateColaboradorCaches();
      setShowSuccess(true);
      setTimeout(() => {
        router.push("/central");
      }, 2000);
    },
    onError: (error: unknown) => {
      const e = error as {
        response?: { data?: { error?: string } };
        message?: string;
      };
      const message =
        e.response?.data?.error || e.message || "Erro ao cadastrar colaborador";
      toast.error(message);
      console.error("Erro ao criar colaborador:", error);
    },
  });

  // Mutação para salvar rascunho
  const draftMutation = useMutation({
    mutationFn: async (data: FullFormData) => {
      const colaborador = buildColaboradorPayload(data);
      return colaboradoresApi.criar(colaborador);
    },
    onSuccess: async () => {
      toast.success("Rascunho salvo com sucesso!");
      await invalidateColaboradorCaches();
      router.push("/central");
    },
    onError: (error: unknown) => {
      const e = error as {
        response?: { data?: { error?: string } };
        message?: string;
      };
      const message =
        e.response?.data?.error || e.message || "Erro ao salvar rascunho";
      toast.error(message);
      console.error("Erro ao salvar rascunho:", error);
    },
  });

  // Mutação para atualizar treinamentos após criação
  const atualizarTreinamentosMutation = useMutation({
    mutationFn: async ({
      colaboradorId,
      selecionados,
    }: {
      colaboradorId: string;
      selecionados: TreinamentoSelecionado[];
    }) => {
      const results = await Promise.all(
        selecionados.map((t) =>
          treinamentosApi.atualizar(colaboradorId, t.treinamento_id, {
            data_realizacao: t.data_realizacao || null,
            data_validade: t.data_validade || null,
          })
        )
      );
      return results;
    },
    onError: () => {
      toast.error("Erro ao salvar treinamentos. Edite o colaborador para configurar.");
    },
  });

  // ============================================================================
  // VERIFICAÇÃO DE CPF EM TEMPO REAL
  // ============================================================================
  const checkCpfDuplicado = useMemo(
    () =>
      debounce(async (cpf: string) => {
        if (cpf.length !== 14) return;

        cpfBeingChecked.current = cpf;
        setCpfChecking(true);

        try {
          const cpfNumerico = cpf.replace(/\D/g, "");
          const response = await fetch(
            `/api/colaboradores?search=${cpfNumerico}&limit=1`
          );
          const data = await response.json();

          if (cpfBeingChecked.current === cpf) {
            if (data.data && data.data.length > 0) {
              setCpfError(`CPF já cadastrado: ${data.data[0].NOME}`);
            } else {
              setCpfError(null);
            }
          }
        } catch {
          if (cpfBeingChecked.current === cpf) {
            setCpfError(null);
          }
        } finally {
          if (cpfBeingChecked.current === cpf) {
            setCpfChecking(false);
          }
        }
      }, 500),
    []
  );

  // Formulário unificado
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
    trigger,
    getValues,
  } = useForm<FullFormData>({
    mode: "onChange",
    defaultValues: {
      cpf: "",
      nome: "",
      centroCusto: centroCusto || "",
      dtNascimento: "",
      idade: undefined,
      municipio: "",
      telefone: "",
      uf: "",
      sexo: undefined,
      ind: "",
      dataAdmissao: "",
      re: "",
      funcaoClt: "",
      histograma: "",
      numeroOracle: null,
      escolaridade: undefined,
      experienciaFuncao: undefined,
      cartaOferta: undefined,
      contrato: undefined,
      status: undefined,
      enviadoRh: undefined,
      vinculado: "",
      termino: "",
      prorrogacao: "",
      demissao: "",
      preAdmissao: undefined,
      docs: "Pendente",
      cracha: "Pendente",
      ponto: "Pendente",
      vr: "Pendente",
      mob: "Pendente",
      op: "",
      req: "",
      colabPend: "Não",
      portal: "Pendente",
      exame: "Pendente",
      aso: "Pendente",
      clinica: "",
      rpv: "",
      tipoContrato: undefined,
    },
  });

  // Watch para valores dos selects
  const ufValue = watch("uf");
  const sexoValue = watch("sexo");
  const cartaOfertaValue = watch("cartaOferta");
  const tipoContratoValue = watch("tipoContrato");
  const contratoValue = watch("contrato");
  const statusValue = watch("status");
  const enviadoRhValue = watch("enviadoRh");
  const preAdmissaoValue = watch("preAdmissao");
  const dtNascimentoValue = watch("dtNascimento");
  const docsValue = watch("docs");
  const crachaValue = watch("cracha");
  const pontoValue = watch("ponto");
  const vrValue = watch("vr");
  const mobValue = watch("mob");
  const colabPendValue = watch("colabPend");
  const portalValue = watch("portal");
  const exameValue = watch("exame");
  const asoValue = watch("aso");
  const clinicaValue = watch("clinica");
  const funcaoCltValue = watch("funcaoClt");
  const escolaridadeValue = watch("escolaridade");
  const experienciaFuncaoValue = watch("experienciaFuncao");
  const centroCustoValue = watch("centroCusto");
  const cpfValue = watch("cpf");

  useEffect(() => {
    if (filterReady && centroCusto && !centroCustoValue) {
      setValue("centroCusto", centroCusto, { shouldValidate: true });
    }
  }, [centroCusto, centroCustoValue, filterReady, setValue]);

  // Verificar CPF duplicado em tempo real
  useEffect(() => {
    if (cpfValue.length !== 14) {
      setCpfError(null);
      return;
    }
    checkCpfDuplicado(cpfValue);
  }, [cpfValue, checkCpfDuplicado]);

  // Calcular idade automaticamente quando dtNascimento mudar
  useEffect(() => {
    const idade = calcularIdade(dtNascimentoValue);
    if (idade !== undefined) {
      setValue("idade", idade);
    }
  }, [dtNascimentoValue, setValue]);

  const onSubmitFinal = async (data: FullFormData) => {
    // Valida CPF, nome e centro de custo
    const isValid = await trigger(["cpf", "nome", "centroCusto"]);
    if (!isValid || cpfError) {
      toast.error("Preencha CPF, Nome e Centro de Custo corretamente.");
      return;
    }

    // Cria o colaborador
    const response = await createMutation.mutateAsync(data);
    const colaboradorId = response.data?.data?.id;

    // Se criou com sucesso e tem treinamentos selecionados, atualiza-os
    if (colaboradorId && treinamentosSelecionados.length > 0) {
      await atualizarTreinamentosMutation.mutateAsync({
        colaboradorId,
        selecionados: treinamentosSelecionados,
      });
    }
  };

  const handleSaveDraft = async () => {
    const data = getValues();
    if (!data.cpf || data.cpf.length !== 14 || !data.nome || data.nome.length < 3) {
      toast.error("CPF e Nome completo são obrigatórios para salvar o rascunho.");
      return;
    }
    const response = await draftMutation.mutateAsync(data);
    const colaboradorId = response.data?.data?.id;
    if (colaboradorId && treinamentosSelecionados.length > 0) {
      await atualizarTreinamentosMutation.mutateAsync({
        colaboradorId,
        selecionados: treinamentosSelecionados,
      });
    }
  };

  const isFormValid =
    watch("cpf")?.length === 14 &&
    watch("nome")?.length >= 3 &&
    !!watch("centroCusto") &&
    !cpfError;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <ProtectedRoute>
      <div className="min-h-screen w-full p-4 md:p-8">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Novo Colaborador
                </h1>
                <p className="text-sm text-muted-foreground">
                  Preencha os dados do colaborador por setor
                </p>
              </div>
              <div className="text-right">
                {centroCusto && (
                  <div className="mb-1 text-xs text-muted-foreground">
                    Centro de custo: <span className="font-medium text-foreground">{centroCusto}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card do Formulário */}
          <Card className="glass-card">
            <Tabs defaultValue="rh" className="w-full">
              <CardHeader className="pb-0">
                <TabsList className="w-full flex justify-start gap-2 bg-transparent border-b border-border/50 pb-2 rounded-none h-auto">
                  <TabsTrigger
                    value="rh"
                    className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                  >
                    <Briefcase className="w-4 h-4 mr-2" />
                    RH
                  </TabsTrigger>
                  <TabsTrigger
                    value="seguranca"
                    className="data-[state=active]:bg-[#337246]/10 data-[state=active]:text-[#337246]"
                  >
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Segurança
                  </TabsTrigger>
                  <TabsTrigger
                    value="logistica"
                    className="data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-400"
                  >
                    <Truck className="w-4 h-4 mr-2" />
                    Logística
                  </TabsTrigger>
                  <TabsTrigger
                    value="outros"
                    className="data-[state=active]:bg-slate-500/10 data-[state=active]:text-slate-400"
                  >
                    <ClipboardList className="w-4 h-4 mr-2" />
                    Outros
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent className="p-6">
                {/* ABA 1 — RH */}
                <TabsContent value="rh" className="w-full mt-6 space-y-8">
                  <div>
                    <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-primary" />
                      Dados Pessoais e Identificação
                    </h2>
                    <p className="text-sm text-muted-foreground">Informações básicas do colaborador</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {/* CPF */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">CPF <span className="text-destructive">*</span></label>
                      <div className="relative">
                        <Controller
                          name="cpf"
                          control={control}
                          render={({ field }) => (
                            <IMaskInput
                              mask="000.000.000-00"
                              placeholder="000.000.000-00"
                              value={field.value}
                              onAccept={(value: string) => field.onChange(value)}
                              className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${errors.cpf || cpfError ? "border-destructive pr-10" : ""} ${cpfChecking ? "pr-10" : ""}`}
                            />
                          )}
                        />
                        {cpfChecking && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        )}
                        {!cpfChecking && cpfError && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          </div>
                        )}
                      </div>
                      {errors.cpf && <p className="text-xs text-destructive">{errors.cpf.message}</p>}
                      {cpfError && <p className="text-xs text-destructive">{cpfError}</p>}
                    </div>

                    {/* Nome */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nome Completo <span className="text-destructive">*</span></label>
                      <Input placeholder="Digite o nome completo" {...register("nome")} className={errors.nome ? "border-destructive" : ""} />
                      {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
                    </div>

                    {/* Centro de Custo */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Centro de Custo <span className="text-destructive">*</span></label>
                      <Select value={centroCustoValue || undefined} onValueChange={(value) => setValue("centroCusto", value, { shouldValidate: true })}>
                        <SelectTrigger className={errors.centroCusto ? "border-destructive" : ""}>
                          <SelectValue placeholder="Selecione o centro de custo..." />
                        </SelectTrigger>
                        <SelectContent>
                          {projetos.map((cc) => (
                            <SelectItem key={cc} value={cc}>{cc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.centroCusto && <p className="text-xs text-destructive">{errors.centroCusto.message}</p>}
                    </div>

                    {/* RE */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">RE (Registro)</label>
                      <Input placeholder="Digite o RE" {...register("re")} />
                    </div>

                    {/* Função CLT */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Função / Cargo CLT</label>
                      <CargoCombobox
                        value={funcaoCltValue}
                        onChange={(value) => setValue("funcaoClt", value, { shouldValidate: true })}
                        placeholder="Selecione o cargo..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Escolaridade</label>
                      <Select
                        value={escolaridadeValue || undefined}
                        onValueChange={(value: (typeof ESCOLARIDADE_OPTIONS)[number]) =>
                          setValue("escolaridade", value, { shouldValidate: true })
                        }
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {ESCOLARIDADE_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Experiência na função</label>
                      <Select
                        value={experienciaFuncaoValue || undefined}
                        onValueChange={(value: (typeof EXPERIENCIA_FUNCAO_OPTIONS)[number]) =>
                          setValue("experienciaFuncao", value, { shouldValidate: true })
                        }
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {EXPERIENCIA_FUNCAO_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Sexo */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Sexo</label>
                      <Select value={sexoValue || undefined} onValueChange={(value: "Masculino" | "Feminino") => setValue("sexo", value, { shouldValidate: true })}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Masculino">Masculino</SelectItem>
                          <SelectItem value="Feminino">Feminino</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Histograma */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Histograma</label>
                      <Input placeholder="Ex: Mecânico / Caldeireiro" {...register("histograma")} />
                    </div>

                    {/* Nº Pessoa */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nº Pessoa</label>
                      <Input placeholder="Número Oracle" {...register("numeroOracle")} />
                    </div>

                    {/* Data Nascimento */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Data de Nascimento</label>
                      <Input type="date" {...register("dtNascimento")} />
                    </div>

                    {/* Idade */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Idade <span className="text-muted-foreground">(Auto)</span></label>
                      <Input type="number" readOnly value={watch("idade") || ""} placeholder="Calculada automaticamente" className="bg-muted/50" />
                    </div>

                    {/* Município */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Município</label>
                      <Input placeholder="Cidade de residência" {...register("municipio")} />
                    </div>

                    {/* UF */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">UF</label>
                      <Select value={ufValue || undefined} onValueChange={(value) => setValue("uf", value, { shouldValidate: true })}>
                        <SelectTrigger><SelectValue placeholder="Selecione a UF" /></SelectTrigger>
                        <SelectContent>
                          {ufs.map((uf) => (<SelectItem key={uf} value={uf}>{uf}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Telefone */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Telefone</label>
                      <Controller
                        name="telefone"
                        control={control}
                        render={({ field }) => (
                          <IMaskInput
                            mask="(00) 00000-0000"
                            placeholder="(00) 00000-0000"
                            value={field.value}
                            onAccept={(value: string) => field.onChange(value)}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        )}
                      />
                    </div>

                    {/* Indicação */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Indicação</label>
                      <Input placeholder="Responsável pela indicação" {...register("ind")} />
                    </div>
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
                      <CalendarCheck className="w-5 h-5 text-primary" />
                      Contrato & Admissão
                    </h2>
                    <p className="text-sm text-muted-foreground">Dados contratuais e datas de vínculo</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <Select value={statusValue || undefined} onValueChange={(value: "Ativo" | "Pendente" | "Inativo" | "Desligado") => setValue("status", value, { shouldValidate: true })}>
                        <SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Ativo">Ativo</SelectItem>
                          <SelectItem value="Pendente">Pendente</SelectItem>
                          <SelectItem value="Inativo">Inativo</SelectItem>
                          <SelectItem value="Desligado">Desligado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tipo de Contrato</label>
                      <Select value={tipoContratoValue || undefined} onValueChange={(value: "Determinado" | "Indeterminado") => setValue("tipoContrato", value, { shouldValidate: true })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Determinado">Determinado</SelectItem>
                          <SelectItem value="Indeterminado">Indeterminado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Contrato</label>
                      <Select value={contratoValue || undefined} onValueChange={(value: "CLT" | "PJ" | "Temporário" | "Estagiário") => setValue("contrato", value, { shouldValidate: true })}>
                        <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CLT">CLT</SelectItem>
                          <SelectItem value="PJ">PJ</SelectItem>
                          <SelectItem value="Temporário">Temporário</SelectItem>
                          <SelectItem value="Estagiário">Estagiário</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Data de Admissão</label>
                      <Input type="date" {...register("dataAdmissao")} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Término <span className="text-muted-foreground">(Opcional)</span></label>
                      <Input type="date" {...register("termino")} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Prorrogação <span className="text-muted-foreground">(Opcional)</span></label>
                      <Input type="date" {...register("prorrogacao")} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Demissão <span className="text-muted-foreground">(Opcional)</span></label>
                      <Input type="date" {...register("demissao")} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Enviado RH</label>
                      <Select value={enviadoRhValue || undefined} onValueChange={(value: "Sim" | "Não" | "Pendente") => setValue("enviadoRh", value, { shouldValidate: true })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sim">Sim</SelectItem>
                          <SelectItem value="Não">Não</SelectItem>
                          <SelectItem value="Pendente">Pendente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Carta Oferta</label>
                      <Select value={cartaOfertaValue || undefined} onValueChange={(value: "Sim" | "Não" | "Pendente") => setValue("cartaOferta", value, { shouldValidate: true })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sim">Sim</SelectItem>
                          <SelectItem value="Não">Não</SelectItem>
                          <SelectItem value="Pendente">Pendente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Pré-Admissão</label>
                      <Select value={preAdmissaoValue || undefined} onValueChange={(value: "Sim" | "Não" | "Pendente") => setValue("preAdmissao", value, { shouldValidate: true })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sim">Sim</SelectItem>
                          <SelectItem value="Não">Não</SelectItem>
                          <SelectItem value="Pendente">Pendente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Vinculado</label>
                      <Select value={watch("vinculado") || undefined} onValueChange={(value) => setValue("vinculado", value, { shouldValidate: true })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sim">Sim</SelectItem>
                          <SelectItem value="Não">Não</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" />
                      Benefícios & Documentação
                    </h2>
                    <p className="text-sm text-muted-foreground">Benefícios e status da documentação</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Documentação</label>
                      <Select value={docsValue || undefined} onValueChange={(value: "Completo" | "Pendente" | "Incompleto") => setValue("docs", value, { shouldValidate: true })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Completo">Completo</SelectItem>
                          <SelectItem value="Pendente">Pendente</SelectItem>
                          <SelectItem value="Incompleto">Incompleto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Crachá</label>
                      <Select value={crachaValue || undefined} onValueChange={(value: "Emitido" | "Pendente") => setValue("cracha", value, { shouldValidate: true })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Emitido">Emitido</SelectItem>
                          <SelectItem value="Pendente">Pendente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Ponto</label>
                      <Select value={pontoValue || undefined} onValueChange={(value: "Cadastrado" | "Pendente") => setValue("ponto", value, { shouldValidate: true })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cadastrado">Cadastrado</SelectItem>
                          <SelectItem value="Pendente">Pendente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">VR (Vale Refeição)</label>
                      <Select
                        value={vrValue === "Ativo" ? "Sim" : vrValue === "Pendente" ? "Não" : undefined}
                        onValueChange={(value: "Sim" | "Não") => setValue("vr", value === "Sim" ? "Ativo" : "Pendente", { shouldValidate: true })}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sim">Sim</SelectItem>
                          <SelectItem value="Não">Não</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                {/* ABA 2 — SEGURANÇA */}
                <TabsContent value="seguranca" className="w-full mt-6 space-y-8">
                  <div>
                    <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-[#337246]" />
                      Saúde Ocupacional
                    </h2>
                    <p className="text-sm text-muted-foreground">Exames admissionais e documentação de saúde</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Exame</label>
                      <Select value={exameValue || undefined} onValueChange={(value: "Realizado" | "Agendado" | "Pendente") => setValue("exame", value, { shouldValidate: true })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Realizado">Realizado</SelectItem>
                          <SelectItem value="Agendado">Agendado</SelectItem>
                          <SelectItem value="Pendente">Pendente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">ASO</label>
                      <Select value={asoValue || undefined} onValueChange={(value: "Apto" | "Inapto" | "Pendente") => setValue("aso", value, { shouldValidate: true })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Apto">Apto</SelectItem>
                          <SelectItem value="Inapto">Inapto</SelectItem>
                          <SelectItem value="Pendente">Pendente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Clínica</label>
                      <Select value={clinicaValue || undefined} onValueChange={(value) => setValue("clinica", value, { shouldValidate: true })}>
                        <SelectTrigger><SelectValue placeholder="Selecione a clínica..." /></SelectTrigger>
                        <SelectContent>
                          {isLoadingClinicas ? (
                            <SelectItem value="__loading__" disabled>Carregando...</SelectItem>
                          ) : clinicas.length === 0 ? (
                            <SelectItem value="__empty__" disabled>Nenhuma clínica cadastrada</SelectItem>
                          ) : (
                            clinicas.map((c) => (
                              <SelectItem key={c.nome} value={c.nome}>{c.nome}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">RPV</label>
                      <Select value={watch("rpv") || undefined} onValueChange={(value) => setValue("rpv", value, { shouldValidate: true })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sim">Sim</SelectItem>
                          <SelectItem value="Não">Não</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-[#337246]" />
                      Treinamentos Normativos
                    </h2>
                    <p className="text-sm text-muted-foreground">Selecione os treinamentos necessários para este colaborador</p>
                  </div>
                  <TreinamentosSelecao onChange={setTreinamentosSelecionados} />
                </TabsContent>

                {/* ABA 3 — LOGÍSTICA */}
                <TabsContent value="logistica" className="w-full mt-6 space-y-8">
                  <div className="flex flex-col items-center justify-center gap-5 py-16 text-center rounded-xl border border-dashed border-border/60">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/20">
                      <Truck className="h-8 w-8 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Configuração posterior</p>
                      <p className="mt-1.5 text-sm text-muted-foreground max-w-md">
                        Passagens, hospedagem e alimentação serão configuradas após a criação do colaborador.
                      </p>
                    </div>
                  </div>
                </TabsContent>

                {/* ABA 4 — OUTROS */}
                <TabsContent value="outros" className="w-full mt-6 space-y-8">
                  <div>
                    <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-slate-500" />
                      Controle Administrativo
                    </h2>
                    <p className="text-sm text-muted-foreground">Campos operacionais diversos</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">MOB</label>
                      <Select value={mobValue || undefined} onValueChange={(value: "Sim" | "Não" | "Pendente") => setValue("mob", value, { shouldValidate: true })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sim">Sim</SelectItem>
                          <SelectItem value="Não">Não</SelectItem>
                          <SelectItem value="Pendente">Pendente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">OP (Ordem de Produção)</label>
                      <Input placeholder="Digite a OP" {...register("op")} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">REQ (Requisição)</label>
                      <Input placeholder="Digite a REQ" {...register("req")} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Colaborador Pendente</label>
                      <Select value={colabPendValue || undefined} onValueChange={(value: "Sim" | "Não") => setValue("colabPend", value, { shouldValidate: true })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sim">Sim</SelectItem>
                          <SelectItem value="Não">Não</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Portal</label>
                      <Select value={portalValue || undefined} onValueChange={(value: "Liberado" | "Pendente" | "Bloqueado") => setValue("portal", value, { shouldValidate: true })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Liberado">Liberado</SelectItem>
                          <SelectItem value="Pendente">Pendente</SelectItem>
                          <SelectItem value="Bloqueado">Bloqueado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                {/* Footer com ações */}
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t">
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.push("/central")}>
                      Cancelar
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleSaveDraft}
                      disabled={draftMutation.isPending || !isFormValid}
                    >
                      {draftMutation.isPending ? "Salvando..." : "Salvar como rascunho"}
                    </Button>
                  </div>
                  <Button
                    onClick={handleSubmit(onSubmitFinal)}
                    disabled={createMutation.isPending || !isFormValid}
                    className="gap-2"
                    style={{ backgroundColor: "#ff460a", borderColor: "#ff460a" }}
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : showSuccess ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Salvo!
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Salvar Colaborador
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
