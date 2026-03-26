"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";

import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronLeft,
  User,
  Briefcase,
  Gift,
  Truck,
  ClipboardList,
  Monitor,
  ShieldCheck,
  GraduationCap,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { IMaskInput } from "react-imask";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
  CardFooter,
} from "@/components/ui/card";

import { colaboradoresApi, clinicasApi } from "@/lib/axios";
import { CargoCombobox } from "@/components/CargoCombobox";

// ============================================================================
// SCHEMAS DE VALIDAÇÃO ZOD - Baseados nas 38 colunas do projeto
// ============================================================================

// Etapa 1: Dados Pessoais (RH)
const step1Schema = z.object({
  cpf: z.string().min(14, "CPF inválido"),
  nome: z.string().min(3, "Nome completo é obrigatório"),
  dtNascimento: z.string().min(1, "Data de nascimento é obrigatória"),
  idade: z.number().min(16).max(99).optional(),
  municipio: z.string().min(1, "Município é obrigatório"),
  telefone: z.string().min(14, "Telefone inválido"),
  uf: z.string().length(2, "UF é obrigatória"),
  pessoa: z.enum(["Física", "Jurídica"]),
  ind: z.string().min(1, "IND é obrigatório"),
});

// Etapa 2: Contratual/Admissão (RH)
const step2Schema = z.object({
  dataAdmissao: z.string().min(1, "Data de admissão é obrigatória"),
  re: z.string().min(1, "RE é obrigatório"),
  funcaoClt: z.string().min(1, "Função CLT é obrigatória"),
  histograma: z.string().min(1, "Histograma é obrigatório"),
  cartaOferta: z.enum(["Sim", "Não", "Pendente"]),
  contrato: z.enum(["CLT", "PJ", "Temporário", "Estagiário"]),
  status: z.enum(["Ativo", "Pendente", "Inativo", "Desligado"]),
  enviadoRh: z.enum(["Sim", "Não", "Pendente"]),
  vinculado: z.string().min(1, "Vinculado é obrigatório"),
  termino: z.string().optional(),
  prorrogacao: z.string().optional(),
  demissao: z.string().optional(),
  preAdmissao: z.enum(["Sim", "Não", "Pendente"]),
});

// Etapa 3: Benefícios (RH)
const step3Schema = z.object({
  docs: z.enum(["Completo", "Pendente", "Incompleto"]),
  cracha: z.enum(["Emitido", "Pendente"]),
  ponto: z.enum(["Cadastrado", "Pendente"]),
  vr: z.enum(["Ativo", "Pendente"]),
});

// Etapa 4: Logística/Mobilização
const step4Schema = z.object({
  mob: z.enum(["Sim", "Não", "Pendente"]),
});

// Etapa 5: Dados Operacionais (Logística)
const step5Schema = z.object({
  op: z.string().min(1, "OP é obrigatória"),
  req: z.string().min(1, "REQ é obrigatória"),
  colabPend: z.enum(["Sim", "Não"]),
});

// Etapa 6: Sistemas (Logística)
const step6Schema = z.object({
  portal: z.enum(["Liberado", "Pendente", "Bloqueado"]),
});

// Etapa 7: Saúde Ocupacional (Segurança)
const step7Schema = z.object({
  exame: z.enum(["Realizado", "Agendado", "Pendente"]),
  aso: z.enum(["Apto", "Inapto", "Pendente"]),
  clinica: z.string().min(1, "Clínica é obrigatória"),
  rpv: z.string().min(1, "RPV é obrigatório"),
});

// Etapa 8: Treinamentos (Segurança)
const step8Schema = z.object({
  treinamento: z.enum(["Concluído", "Em Andamento", "Pendente"]),
  realizarTreinamento: z.enum(["Sim", "Não", "Pendente"]),
  localTreinamento: z.string().min(1, "Local do treinamento é obrigatório"),
});

// Schema completo combinado (todas as 38 colunas)
const fullSchema = step1Schema
  .merge(step2Schema)
  .merge(step3Schema)
  .merge(step4Schema)
  .merge(step5Schema)
  .merge(step6Schema)
  .merge(step7Schema)
  .merge(step8Schema);

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;
type Step4Data = z.infer<typeof step4Schema>;
type Step5Data = z.infer<typeof step5Schema>;
type Step6Data = z.infer<typeof step6Schema>;
type Step7Data = z.infer<typeof step7Schema>;

type FullFormData = z.infer<typeof fullSchema>;

// ============================================================================
// LISTA DE UF DO BRASIL
// ============================================================================

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

// Calcular idade baseado na data de nascimento
function calcularIdade(dataNascimento: string): number | undefined {
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
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const totalSteps = 8;
  const router = useRouter();

  // Busca clínicas da API
  const { data: clinicasData, isLoading: isLoadingClinicas } = useQuery({
    queryKey: ["clinicas"],
    queryFn: async () => {
      const response = await clinicasApi.listar();
      return response.data;
    },
  });

  const clinicas = clinicasData?.data || [];

  // Mutação para criar colaborador
  const createMutation = useMutation({
    mutationFn: async (data: FullFormData) => {
      // Mapeia os dados do formulário para o formato da API (38 colunas)
      const colaborador = {
        // Colunas 1-5
        IND: data.ind,
        STATUS: data.status,
        ENVIADO_RH: data.enviadoRh,
        PESSOA: data.pessoa,
        REQ: data.req,
        // Colunas 6-10
        VINCULADO: data.vinculado,
        CARTA_OFERTA: data.cartaOferta,
        COLAB_PEND: data.colabPend,
        EXAME: data.exame,
        CLINICA: data.clinica,
        // Colunas 11-15
        DOCS: data.docs,
        ASO: data.aso,
        RPV: data.rpv,
        PRE_ADMISSAO: data.preAdmissao,
        MOB: data.mob,
        // Colunas 16-20
        OP: data.op,
        DATA_ADMISSAO: data.dataAdmissao,
        CONTRATO: data.contrato,
        PORTAL: data.portal,
        CRACHA: data.cracha,
        // Colunas 21-25
        PONTO: data.ponto,
        TREINAMENTO: data.treinamento,
        REALIZAR_TREINAMENTO: data.realizarTreinamento,
        LOCAL_TREINAMENTO: data.localTreinamento,
        RE: data.re,
        // Colunas 26-30
        NOME: data.nome,
        FUNCAO_CLT: data.funcaoClt,
        HISTOGRAMA: data.histograma,
        IDADE: data.idade,
        DT_NASCIMENTO: data.dtNascimento,
        // Colunas 31-35
        CPF: data.cpf.replace(/\D/g, ""), // Remove máscara
        VR: data.vr,
        TERMINO: data.termino || null,
        PRORROGACAO: data.prorrogacao || null,
        DEMISSAO: data.demissao || null,
        // Colunas 36-38
        MUNICIPIO: data.municipio,
        UF: data.uf,
        TELEFONE: data.telefone,
      };

      return colaboradoresApi.criar(colaborador);
    },
    onSuccess: () => {
      toast.success("Colaborador cadastrado com sucesso!");
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

  // Formulário unificado para todos os passos
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
    trigger,
  } = useForm<FullFormData>({
    mode: "onChange",
    defaultValues: {
      // Step 1 - Dados Pessoais
      cpf: "",
      nome: "",
      dtNascimento: "",
      idade: undefined,
      municipio: "",
      telefone: "",
      uf: "",
      pessoa: undefined,
      ind: "",
      // Step 2 - Contratual/Admissão
      dataAdmissao: "",
      re: "",
      funcaoClt: "",
      histograma: "",
      cartaOferta: undefined,
      contrato: undefined,
      status: undefined,
      enviadoRh: undefined,
      vinculado: "",
      termino: "",
      prorrogacao: "",
      demissao: "",
      preAdmissao: undefined,
      // Step 3 - Benefícios
      docs: "Pendente",
      cracha: "Pendente",
      ponto: "Pendente",
      vr: "Pendente",
      // Step 4 - Logística/Mobilização
      mob: "Pendente",
      // Step 5 - Dados Operacionais
      op: "",
      req: "",
      colabPend: "Não",
      // Step 6 - Sistemas
      portal: "Pendente",
      // Step 7 - Saúde Ocupacional
      exame: "Pendente",
      aso: "Pendente",
      clinica: "",
      rpv: "",
      // Step 8 - Treinamentos
      treinamento: "Pendente",
      realizarTreinamento: "Sim",
      localTreinamento: "",
    },
  });

  // Watch para valores dos selects
  const ufValue = watch("uf");
  const pessoaValue = watch("pessoa");
  const cartaOfertaValue = watch("cartaOferta");
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
  const treinamentoValue = watch("treinamento");
  const realizarTreinamentoValue = watch("realizarTreinamento");
  const funcaoCltValue = watch("funcaoClt");

  // Calcular idade automaticamente quando dtNascimento mudar
  useEffect(() => {
    const idade = calcularIdade(dtNascimentoValue);
    if (idade !== undefined) {
      setValue("idade", idade);
    }
  }, [dtNascimentoValue, setValue]);

  const progressValue = (step / totalSteps) * 100;

  const handleNext = async () => {
    if (step === 1) {
      const isValid = await trigger([
        "cpf",
        "nome",
        "dtNascimento",
        "municipio",
        "telefone",
        "uf",
        "pessoa",
        "ind",
      ]);
      if (isValid) {
        setDirection(1);
        setStep(2);
      }
    } else if (step === 2) {
      const isValid = await trigger([
        "dataAdmissao",
        "re",
        "funcaoClt",
        "histograma",
        "cartaOferta",
        "contrato",
        "status",
        "enviadoRh",
        "vinculado",
        "preAdmissao",
      ]);
      if (isValid) {
        setDirection(1);
        setStep(3);
      }
    } else if (step === 3) {
      const isValid = await trigger(["docs", "cracha", "ponto", "vr"]);
      if (isValid) {
        setDirection(1);
        setStep(4);
      }
    } else if (step === 4) {
      const isValid = await trigger(["mob"]);
      if (isValid) {
        setDirection(1);
        setStep(5);
      }
    } else if (step === 5) {
      const isValid = await trigger(["op", "req", "colabPend"]);
      if (isValid) {
        setDirection(1);
        setStep(6);
      }
    } else if (step === 6) {
      const isValid = await trigger(["portal"]);
      if (isValid) {
        setDirection(1);
        setStep(7);
      }
    } else if (step === 7) {
      const isValid = await trigger(["exame", "aso", "clinica", "rpv"]);
      if (isValid) {
        setDirection(1);
        setStep(8);
      }
    } else if (step < totalSteps) {
      setDirection(1);
      setStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setDirection(-1);
      setStep((prev) => prev - 1);
    }
  };

  const onSubmitStep1 = (_data: Step1Data) => {
    handleNext();
  };

  const onSubmitStep2 = (_data: Step2Data) => {
    handleNext();
  };

  const onSubmitStep3 = (_data: Step3Data) => {
    handleNext();
  };

  const onSubmitStep4 = (_data: Step4Data) => {
    handleNext();
  };

  const onSubmitStep5 = (_data: Step5Data) => {
    handleNext();
  };

  const onSubmitStep6 = (_data: Step6Data) => {
    handleNext();
  };

  const onSubmitStep7 = (_data: Step7Data) => {
    handleNext();
  };

  const onSubmitFinal = (data: FullFormData) => {
    createMutation.mutate(data);
  };

  // Variantes de animação
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  // Verifica se o passo atual é válido
  const isStep1Valid =
    watch("cpf")?.length === 14 &&
    watch("nome")?.length >= 3 &&
    watch("dtNascimento") !== "" &&
    watch("municipio") !== "" &&
    watch("telefone")?.length >= 14 &&
    watch("uf")?.length === 2 &&
    watch("pessoa") !== undefined &&
    watch("ind") !== "";

  const isStep2Valid =
    watch("dataAdmissao") !== "" &&
    watch("re") !== "" &&
    watch("funcaoClt") !== "" &&
    watch("histograma") !== "" &&
    watch("cartaOferta") !== undefined &&
    watch("contrato") !== undefined &&
    watch("status") !== undefined &&
    watch("enviadoRh") !== undefined &&
    watch("vinculado") !== "" &&
    watch("preAdmissao") !== undefined;

  const isStep3Valid = true;
  const isStep4Valid = watch("mob") !== undefined;
  const isStep5Valid =
    watch("op") !== "" &&
    watch("req") !== "" &&
    watch("colabPend") !== undefined;
  const isStep6Valid = watch("portal") !== undefined;
  const isStep7Valid =
    watch("exame") !== undefined &&
    watch("aso") !== undefined &&
    watch("clinica") !== "" &&
    watch("rpv") !== "";
  const isStep8Valid =
    watch("treinamento") !== undefined &&
    watch("realizarTreinamento") !== undefined &&
    watch("localTreinamento") !== "";

  return (
    <ProtectedRoute>
      <div className="min-h-screen w-full p-4 md:p-8">
        <div className="mx-auto max-w-4xl">
          {/* Header com Progresso */}
          <div className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Novo Colaborador
                </h1>
                <p className="text-sm text-muted-foreground">
                  Preencha os dados do colaborador em {totalSteps} etapas
                </p>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-primary">
                  Etapa {step} de {totalSteps}
                </span>
              </div>
            </div>

            <Progress value={progressValue} className="h-2" />

            <div className="mt-4 flex justify-between">
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
                <div
                  key={s}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-all duration-300 ${
                    s === step
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                      : s < step
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s < step ? (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    s
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Card do Formulário */}
          <Card className="glass-card relative overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              {/* PASSO 1: DADOS PESSOAIS */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 },
                  }}
                >
                  <CardHeader className="pb-8">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Dados Pessoais</CardTitle>
                        <CardDescription>
                          Informações básicas do colaborador (Etapa 1 - RH)
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <form onSubmit={handleSubmit(onSubmitStep1)}>
                    <CardContent className="space-y-8 py-4">
                      <div className="space-y-2">
                        <label
                          htmlFor="cpf"
                          className="text-sm font-medium text-foreground"
                        >
                          CPF <span className="text-destructive">*</span>
                        </label>
                        <Controller
                          name="cpf"
                          control={control}
                          render={({ field }) => (
                            <IMaskInput
                              id="cpf"
                              mask="000.000.000-00"
                              placeholder="000.000.000-00"
                              value={field.value}
                              onAccept={(value: string) =>
                                field.onChange(value)
                              }
                              className={`flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30 ${
                                errors.cpf ? "border-destructive" : ""
                              }`}
                            />
                          )}
                        />
                        {errors.cpf && (
                          <p className="text-xs text-destructive">
                            {errors.cpf.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="nome"
                          className="text-sm font-medium text-foreground"
                        >
                          Nome Completo{" "}
                          <span className="text-destructive">*</span>
                        </label>
                        <Input
                          id="nome"
                          placeholder="Digite o nome completo"
                          {...register("nome")}
                          className={errors.nome ? "border-destructive" : ""}
                        />
                        {errors.nome && (
                          <p className="text-xs text-destructive">
                            {errors.nome.message}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label
                            htmlFor="dtNascimento"
                            className="text-sm font-medium text-foreground"
                          >
                            Data de Nascimento{" "}
                            <span className="text-destructive">*</span>
                          </label>
                          <Input
                            id="dtNascimento"
                            type="date"
                            {...register("dtNascimento")}
                            className={
                              errors.dtNascimento ? "border-destructive" : ""
                            }
                          />
                          {errors.dtNascimento && (
                            <p className="text-xs text-destructive">
                              {errors.dtNascimento.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label
                            htmlFor="idade"
                            className="text-sm font-medium text-foreground"
                          >
                            Idade{" "}
                            <span className="text-muted-foreground">
                              (Auto)
                            </span>
                          </label>
                          <Input
                            id="idade"
                            type="number"
                            readOnly
                            value={watch("idade") || ""}
                            placeholder="Calculada automaticamente"
                            className="bg-muted/50"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="municipio"
                          className="text-sm font-medium text-foreground"
                        >
                          Município <span className="text-destructive">*</span>
                        </label>
                        <Input
                          id="municipio"
                          placeholder="Digite o município"
                          {...register("municipio")}
                          className={
                            errors.municipio ? "border-destructive" : ""
                          }
                        />
                        {errors.municipio && (
                          <p className="text-xs text-destructive">
                            {errors.municipio.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="telefone"
                          className="text-sm font-medium text-foreground"
                        >
                          Telefone <span className="text-destructive">*</span>
                        </label>
                        <Controller
                          name="telefone"
                          control={control}
                          render={({ field }) => (
                            <IMaskInput
                              id="telefone"
                              mask="(00) 00000-0000"
                              placeholder="(00) 00000-0000"
                              value={field.value}
                              onAccept={(value: string) =>
                                field.onChange(value)
                              }
                              className={`flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30 ${
                                errors.telefone ? "border-destructive" : ""
                              }`}
                            />
                          )}
                        />
                        {errors.telefone && (
                          <p className="text-xs text-destructive">
                            {errors.telefone.message}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label
                            htmlFor="uf"
                            className="text-sm font-medium text-foreground"
                          >
                            UF <span className="text-destructive">*</span>
                          </label>
                          <Select
                            value={ufValue}
                            onValueChange={(value) =>
                              setValue("uf", value, { shouldValidate: true })
                            }
                          >
                            <SelectTrigger
                              className={errors.uf ? "border-destructive" : ""}
                            >
                              <SelectValue placeholder="Selecione a UF" />
                            </SelectTrigger>
                            <SelectContent>
                              {ufs.map((uf) => (
                                <SelectItem key={uf} value={uf}>
                                  {uf}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.uf && (
                            <p className="text-xs text-destructive">
                              {errors.uf.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label
                            htmlFor="pessoa"
                            className="text-sm font-medium text-foreground"
                          >
                            Pessoa <span className="text-destructive">*</span>
                          </label>
                          <Select
                            value={pessoaValue}
                            onValueChange={(value: "Física" | "Jurídica") =>
                              setValue("pessoa", value, {
                                shouldValidate: true,
                              })
                            }
                          >
                            <SelectTrigger
                              className={
                                errors.pessoa ? "border-destructive" : ""
                              }
                            >
                              <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Física">Física</SelectItem>
                              <SelectItem value="Jurídica">Jurídica</SelectItem>
                            </SelectContent>
                          </Select>
                          {errors.pessoa && (
                            <p className="text-xs text-destructive">
                              {errors.pessoa.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="ind"
                          className="text-sm font-medium text-foreground"
                        >
                          IND <span className="text-destructive">*</span>
                        </label>
                        <Input
                          id="ind"
                          placeholder="Digite o indicador"
                          {...register("ind")}
                          className={errors.ind ? "border-destructive" : ""}
                        />
                        {errors.ind && (
                          <p className="text-xs text-destructive">
                            {errors.ind.message}
                          </p>
                        )}
                      </div>
                    </CardContent>

                    <CardFooter className="flex justify-end border-t bg-muted/50 py-6">
                      <Button
                        type="submit"
                        disabled={!isStep1Valid}
                        className="gap-2"
                      >
                        Próximo <ChevronRight className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </form>
                </motion.div>
              )}

              {/* PASSO 2: CONTRATUAL/ADMISSÃO */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 },
                  }}
                >
                  <CardHeader className="pb-8">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Briefcase className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Contratual / Admissão</CardTitle>
                        <CardDescription>
                          Dados contratuais do colaborador (Etapa 2 - RH)
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <form onSubmit={handleSubmit(onSubmitStep2)}>
                    <CardContent className="space-y-8 py-4">
                      <div className="space-y-2">
                        <label
                          htmlFor="dataAdmissao"
                          className="text-sm font-medium text-foreground"
                        >
                          Data de Admissão{" "}
                          <span className="text-destructive">*</span>
                        </label>
                        <Input
                          id="dataAdmissao"
                          type="date"
                          {...register("dataAdmissao")}
                          className={
                            errors.dataAdmissao ? "border-destructive" : ""
                          }
                        />
                        {errors.dataAdmissao && (
                          <p className="text-xs text-destructive">
                            {errors.dataAdmissao.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="re"
                          className="text-sm font-medium text-foreground"
                        >
                          RE <span className="text-destructive">*</span>
                        </label>
                        <Input
                          id="re"
                          placeholder="Digite o RE"
                          {...register("re")}
                          className={errors.re ? "border-destructive" : ""}
                        />
                        {errors.re && (
                          <p className="text-xs text-destructive">
                            {errors.re.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="funcaoClt"
                          className="text-sm font-medium text-foreground"
                        >
                          Função CLT <span className="text-destructive">*</span>
                        </label>
                        <CargoCombobox
                          value={funcaoCltValue}
                          onChange={(value) =>
                            setValue("funcaoClt", value, {
                              shouldValidate: true,
                            })
                          }
                          placeholder="Selecione o cargo..."
                        />
                        {errors.funcaoClt && (
                          <p className="text-xs text-destructive">
                            {errors.funcaoClt.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="histograma"
                          className="text-sm font-medium text-foreground"
                        >
                          Histograma <span className="text-destructive">*</span>
                        </label>
                        <Input
                          id="histograma"
                          placeholder="Digite o histograma"
                          {...register("histograma")}
                          className={
                            errors.histograma ? "border-destructive" : ""
                          }
                        />
                        {errors.histograma && (
                          <p className="text-xs text-destructive">
                            {errors.histograma.message}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label
                            htmlFor="cartaOferta"
                            className="text-sm font-medium text-foreground"
                          >
                            Carta Oferta{" "}
                            <span className="text-destructive">*</span>
                          </label>
                          <Select
                            value={cartaOfertaValue}
                            onValueChange={(
                              value: "Sim" | "Não" | "Pendente",
                            ) =>
                              setValue("cartaOferta", value, {
                                shouldValidate: true,
                              })
                            }
                          >
                            <SelectTrigger
                              className={
                                errors.cartaOferta ? "border-destructive" : ""
                              }
                            >
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Sim">Sim</SelectItem>
                              <SelectItem value="Não">Não</SelectItem>
                              <SelectItem value="Pendente">Pendente</SelectItem>
                            </SelectContent>
                          </Select>
                          {errors.cartaOferta && (
                            <p className="text-xs text-destructive">
                              {errors.cartaOferta.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label
                            htmlFor="contrato"
                            className="text-sm font-medium text-foreground"
                          >
                            Contrato <span className="text-destructive">*</span>
                          </label>
                          <Select
                            value={contratoValue}
                            onValueChange={(
                              value: "CLT" | "PJ" | "Temporário" | "Estagiário",
                            ) =>
                              setValue("contrato", value, {
                                shouldValidate: true,
                              })
                            }
                          >
                            <SelectTrigger
                              className={
                                errors.contrato ? "border-destructive" : ""
                              }
                            >
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CLT">CLT</SelectItem>
                              <SelectItem value="PJ">PJ</SelectItem>
                              <SelectItem value="Temporário">
                                Temporário
                              </SelectItem>
                              <SelectItem value="Estagiário">
                                Estagiário
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {errors.contrato && (
                            <p className="text-xs text-destructive">
                              {errors.contrato.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label
                            htmlFor="status"
                            className="text-sm font-medium text-foreground"
                          >
                            Status <span className="text-destructive">*</span>
                          </label>
                          <Select
                            value={statusValue}
                            onValueChange={(
                              value:
                                | "Ativo"
                                | "Pendente"
                                | "Inativo"
                                | "Desligado",
                            ) =>
                              setValue("status", value, {
                                shouldValidate: true,
                              })
                            }
                          >
                            <SelectTrigger
                              className={
                                errors.status ? "border-destructive" : ""
                              }
                            >
                              <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Ativo">Ativo</SelectItem>
                              <SelectItem value="Pendente">Pendente</SelectItem>
                              <SelectItem value="Inativo">Inativo</SelectItem>
                              <SelectItem value="Desligado">
                                Desligado
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {errors.status && (
                            <p className="text-xs text-destructive">
                              {errors.status.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label
                            htmlFor="enviadoRh"
                            className="text-sm font-medium text-foreground"
                          >
                            Enviado RH{" "}
                            <span className="text-destructive">*</span>
                          </label>
                          <Select
                            value={enviadoRhValue}
                            onValueChange={(
                              value: "Sim" | "Não" | "Pendente",
                            ) =>
                              setValue("enviadoRh", value, {
                                shouldValidate: true,
                              })
                            }
                          >
                            <SelectTrigger
                              className={
                                errors.enviadoRh ? "border-destructive" : ""
                              }
                            >
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Sim">Sim</SelectItem>
                              <SelectItem value="Não">Não</SelectItem>
                              <SelectItem value="Pendente">Pendente</SelectItem>
                            </SelectContent>
                          </Select>
                          {errors.enviadoRh && (
                            <p className="text-xs text-destructive">
                              {errors.enviadoRh.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="vinculado"
                          className="text-sm font-medium text-foreground"
                        >
                          Vinculado <span className="text-destructive">*</span>
                        </label>
                        <Input
                          id="vinculado"
                          placeholder="Digite o vínculo"
                          {...register("vinculado")}
                          className={
                            errors.vinculado ? "border-destructive" : ""
                          }
                        />
                        {errors.vinculado && (
                          <p className="text-xs text-destructive">
                            {errors.vinculado.message}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <label
                            htmlFor="termino"
                            className="text-sm font-medium text-foreground"
                          >
                            Término{" "}
                            <span className="text-muted-foreground">
                              (Opcional)
                            </span>
                          </label>
                          <Input
                            id="termino"
                            type="date"
                            {...register("termino")}
                          />
                        </div>

                        <div className="space-y-2">
                          <label
                            htmlFor="prorrogacao"
                            className="text-sm font-medium text-foreground"
                          >
                            Prorrogação{" "}
                            <span className="text-muted-foreground">
                              (Opcional)
                            </span>
                          </label>
                          <Input
                            id="prorrogacao"
                            type="date"
                            {...register("prorrogacao")}
                          />
                        </div>

                        <div className="space-y-2">
                          <label
                            htmlFor="demissao"
                            className="text-sm font-medium text-foreground"
                          >
                            Demissão{" "}
                            <span className="text-muted-foreground">
                              (Opcional)
                            </span>
                          </label>
                          <Input
                            id="demissao"
                            type="date"
                            {...register("demissao")}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="preAdmissao"
                          className="text-sm font-medium text-foreground"
                        >
                          Pré-Admissão{" "}
                          <span className="text-destructive">*</span>
                        </label>
                        <Select
                          value={preAdmissaoValue}
                          onValueChange={(value: "Sim" | "Não" | "Pendente") =>
                            setValue("preAdmissao", value, {
                              shouldValidate: true,
                            })
                          }
                        >
                          <SelectTrigger
                            className={
                              errors.preAdmissao ? "border-destructive" : ""
                            }
                          >
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Sim">Sim</SelectItem>
                            <SelectItem value="Não">Não</SelectItem>
                            <SelectItem value="Pendente">Pendente</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.preAdmissao && (
                          <p className="text-xs text-destructive">
                            {errors.preAdmissao.message}
                          </p>
                        )}
                      </div>
                    </CardContent>

                    <CardFooter className="flex justify-between border-t bg-muted/50 py-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePrevious}
                        className="gap-2"
                      >
                        <ChevronLeft className="h-4 w-4" /> Voltar
                      </Button>
                      <Button
                        type="submit"
                        disabled={!isStep2Valid}
                        className="gap-2"
                      >
                        Próximo <ChevronRight className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </form>
                </motion.div>
              )}

              {/* PASSO 3: BENEFÍCIOS */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 },
                  }}
                >
                  <CardHeader className="pb-8">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Gift className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Benefícios</CardTitle>
                        <CardDescription>
                          Checklist de benefícios do colaborador (Etapa 3 - RH)
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <form onSubmit={handleSubmit(onSubmitStep3)}>
                    <CardContent className="space-y-8 py-4">
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <label
                            htmlFor="docs"
                            className="text-sm font-medium text-foreground"
                          >
                            Documentação{" "}
                            <span className="text-destructive">*</span>
                          </label>
                          <Select
                            value={docsValue}
                            onValueChange={(
                              value: "Completo" | "Pendente" | "Incompleto",
                            ) =>
                              setValue("docs", value, { shouldValidate: true })
                            }
                          >
                            <SelectTrigger
                              className={
                                errors.docs ? "border-destructive" : ""
                              }
                            >
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Completo">Completo</SelectItem>
                              <SelectItem value="Pendente">Pendente</SelectItem>
                              <SelectItem value="Incompleto">
                                Incompleto
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {errors.docs && (
                            <p className="text-xs text-destructive">
                              {errors.docs.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label
                            htmlFor="cracha"
                            className="text-sm font-medium text-foreground"
                          >
                            Crachá <span className="text-destructive">*</span>
                          </label>
                          <Select
                            value={crachaValue}
                            onValueChange={(value: "Emitido" | "Pendente") =>
                              setValue("cracha", value, {
                                shouldValidate: true,
                              })
                            }
                          >
                            <SelectTrigger
                              className={
                                errors.cracha ? "border-destructive" : ""
                              }
                            >
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Emitido">Emitido</SelectItem>
                              <SelectItem value="Pendente">Pendente</SelectItem>
                            </SelectContent>
                          </Select>
                          {errors.cracha && (
                            <p className="text-xs text-destructive">
                              {errors.cracha.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label
                            htmlFor="ponto"
                            className="text-sm font-medium text-foreground"
                          >
                            Ponto <span className="text-destructive">*</span>
                          </label>
                          <Select
                            value={pontoValue}
                            onValueChange={(value: "Cadastrado" | "Pendente") =>
                              setValue("ponto", value, { shouldValidate: true })
                            }
                          >
                            <SelectTrigger
                              className={
                                errors.ponto ? "border-destructive" : ""
                              }
                            >
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Cadastrado">
                                Cadastrado
                              </SelectItem>
                              <SelectItem value="Pendente">Pendente</SelectItem>
                            </SelectContent>
                          </Select>
                          {errors.ponto && (
                            <p className="text-xs text-destructive">
                              {errors.ponto.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label
                            htmlFor="vr"
                            className="text-sm font-medium text-foreground"
                          >
                            VR <span className="text-destructive">*</span>
                          </label>
                          <Select
                            value={vrValue}
                            onValueChange={(value: "Ativo" | "Pendente") =>
                              setValue("vr", value, { shouldValidate: true })
                            }
                          >
                            <SelectTrigger
                              className={errors.vr ? "border-destructive" : ""}
                            >
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Ativo">Ativo</SelectItem>
                              <SelectItem value="Pendente">Pendente</SelectItem>
                            </SelectContent>
                          </Select>
                          {errors.vr && (
                            <p className="text-xs text-destructive">
                              {errors.vr.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="flex justify-between border-t bg-muted/50 py-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePrevious}
                        className="gap-2"
                      >
                        <ChevronLeft className="h-4 w-4" /> Voltar
                      </Button>
                      <Button
                        type="submit"
                        disabled={!isStep3Valid}
                        className="gap-2"
                      >
                        Próximo <ChevronRight className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </form>
                </motion.div>
              )}

              {/* PASSO 4: LOGÍSTICA/MOBILIZAÇÃO */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 },
                  }}
                >
                  <CardHeader className="pb-8">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Truck className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Logística / Mobilização</CardTitle>
                        <CardDescription>
                          Deslocamento do colaborador (Etapa 4 - Logística)
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <form onSubmit={handleSubmit(onSubmitStep4)}>
                    <CardContent className="py-12">
                      <div className="mx-auto max-w-md">
                        <div className="space-y-2">
                          <label
                            htmlFor="mob"
                            className="text-sm font-medium text-foreground"
                          >
                            MOB <span className="text-destructive">*</span>
                          </label>
                          <Select
                            value={mobValue}
                            onValueChange={(
                              value: "Sim" | "Não" | "Pendente",
                            ) =>
                              setValue("mob", value, { shouldValidate: true })
                            }
                          >
                            <SelectTrigger
                              className={errors.mob ? "border-destructive" : ""}
                            >
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Sim">Sim</SelectItem>
                              <SelectItem value="Não">Não</SelectItem>
                              <SelectItem value="Pendente">Pendente</SelectItem>
                            </SelectContent>
                          </Select>
                          {errors.mob && (
                            <p className="text-xs text-destructive">
                              {errors.mob.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="flex justify-between border-t bg-muted/50 py-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePrevious}
                        className="gap-2"
                      >
                        <ChevronLeft className="h-4 w-4" /> Voltar
                      </Button>
                      <Button
                        type="submit"
                        disabled={!isStep4Valid}
                        className="gap-2"
                      >
                        Próximo <ChevronRight className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </form>
                </motion.div>
              )}

              {/* PASSO 5: DADOS OPERACIONAIS */}
              {step === 5 && (
                <motion.div
                  key="step5"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 },
                  }}
                >
                  <CardHeader className="pb-8">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <ClipboardList className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Dados Operacionais</CardTitle>
                        <CardDescription>
                          Informações operacionais (Etapa 5 - Logística)
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <form onSubmit={handleSubmit(onSubmitStep5)}>
                    <CardContent className="space-y-8 py-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label
                            htmlFor="op"
                            className="text-sm font-medium text-foreground"
                          >
                            OP <span className="text-destructive">*</span>
                          </label>
                          <Input
                            id="op"
                            placeholder="Digite a OP"
                            {...register("op")}
                            className={errors.op ? "border-destructive" : ""}
                          />
                          {errors.op && (
                            <p className="text-xs text-destructive">
                              {errors.op.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label
                            htmlFor="req"
                            className="text-sm font-medium text-foreground"
                          >
                            REQ <span className="text-destructive">*</span>
                          </label>
                          <Input
                            id="req"
                            placeholder="Digite a REQ"
                            {...register("req")}
                            className={errors.req ? "border-destructive" : ""}
                          />
                          {errors.req && (
                            <p className="text-xs text-destructive">
                              {errors.req.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mx-auto max-w-md pt-4">
                        <div className="space-y-2">
                          <label
                            htmlFor="colabPend"
                            className="text-sm font-medium text-foreground"
                          >
                            Colaborador Pendente{" "}
                            <span className="text-destructive">*</span>
                          </label>
                          <Select
                            value={colabPendValue}
                            onValueChange={(value: "Sim" | "Não") =>
                              setValue("colabPend", value, {
                                shouldValidate: true,
                              })
                            }
                          >
                            <SelectTrigger
                              className={
                                errors.colabPend ? "border-destructive" : ""
                              }
                            >
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Sim">Sim</SelectItem>
                              <SelectItem value="Não">Não</SelectItem>
                            </SelectContent>
                          </Select>
                          {errors.colabPend && (
                            <p className="text-xs text-destructive">
                              {errors.colabPend.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="flex justify-between border-t bg-muted/50 py-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePrevious}
                        className="gap-2"
                      >
                        <ChevronLeft className="h-4 w-4" /> Voltar
                      </Button>
                      <Button
                        type="submit"
                        disabled={!isStep5Valid}
                        className="gap-2"
                      >
                        Próximo <ChevronRight className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </form>
                </motion.div>
              )}

              {/* PASSO 6: SISTEMAS */}
              {step === 6 && (
                <motion.div
                  key="step6"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 },
                  }}
                >
                  <CardHeader className="pb-8">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Monitor className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Sistemas</CardTitle>
                        <CardDescription>
                          Cadastro em sistemas de acesso (Etapa 6 - Logística)
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <form onSubmit={handleSubmit(onSubmitStep6)}>
                    <CardContent className="py-12">
                      <div className="mx-auto max-w-md">
                        <div className="space-y-2">
                          <label
                            htmlFor="portal"
                            className="text-sm font-medium text-foreground"
                          >
                            Portal <span className="text-destructive">*</span>
                          </label>
                          <Select
                            value={portalValue}
                            onValueChange={(
                              value: "Liberado" | "Pendente" | "Bloqueado",
                            ) =>
                              setValue("portal", value, {
                                shouldValidate: true,
                              })
                            }
                          >
                            <SelectTrigger
                              className={
                                errors.portal ? "border-destructive" : ""
                              }
                            >
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Liberado">Liberado</SelectItem>
                              <SelectItem value="Pendente">Pendente</SelectItem>
                              <SelectItem value="Bloqueado">
                                Bloqueado
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {errors.portal && (
                            <p className="text-xs text-destructive">
                              {errors.portal.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="flex justify-between border-t bg-muted/50 py-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePrevious}
                        className="gap-2"
                      >
                        <ChevronLeft className="h-4 w-4" /> Voltar
                      </Button>
                      <Button
                        type="submit"
                        disabled={!isStep6Valid}
                        className="gap-2"
                      >
                        Próximo <ChevronRight className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </form>
                </motion.div>
              )}

              {/* PASSO 7: SAÚDE OCUPACIONAL */}
              {step === 7 && (
                <motion.div
                  key="step7"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 },
                  }}
                >
                  <CardHeader className="pb-8">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Saúde Ocupacional</CardTitle>
                        <CardDescription>
                          Exames e saúde do colaborador (Etapa 7 - Segurança)
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <form onSubmit={handleSubmit(onSubmitStep7)}>
                    <CardContent className="space-y-8 py-4">
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <label
                            htmlFor="exame"
                            className="text-sm font-medium text-foreground"
                          >
                            Exame <span className="text-destructive">*</span>
                          </label>
                          <Select
                            value={exameValue}
                            onValueChange={(
                              value: "Realizado" | "Agendado" | "Pendente",
                            ) =>
                              setValue("exame", value, { shouldValidate: true })
                            }
                          >
                            <SelectTrigger
                              className={
                                errors.exame ? "border-destructive" : ""
                              }
                            >
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Realizado">
                                Realizado
                              </SelectItem>
                              <SelectItem value="Agendado">Agendado</SelectItem>
                              <SelectItem value="Pendente">Pendente</SelectItem>
                            </SelectContent>
                          </Select>
                          {errors.exame && (
                            <p className="text-xs text-destructive">
                              {errors.exame.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label
                            htmlFor="aso"
                            className="text-sm font-medium text-foreground"
                          >
                            ASO <span className="text-destructive">*</span>
                          </label>
                          <Select
                            value={asoValue}
                            onValueChange={(
                              value: "Apto" | "Inapto" | "Pendente",
                            ) =>
                              setValue("aso", value, { shouldValidate: true })
                            }
                          >
                            <SelectTrigger
                              className={errors.aso ? "border-destructive" : ""}
                            >
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Apto">Apto</SelectItem>
                              <SelectItem value="Inapto">Inapto</SelectItem>
                              <SelectItem value="Pendente">Pendente</SelectItem>
                            </SelectContent>
                          </Select>
                          {errors.aso && (
                            <p className="text-xs text-destructive">
                              {errors.aso.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label
                            htmlFor="clinica"
                            className="text-sm font-medium text-foreground"
                          >
                            Clínica <span className="text-destructive">*</span>
                          </label>
                          <Select
                            value={clinicaValue}
                            onValueChange={(value: string) =>
                              setValue("clinica", value, {
                                shouldValidate: true,
                              })
                            }
                          >
                            <SelectTrigger
                              className={
                                errors.clinica ? "border-destructive" : ""
                              }
                            >
                              <SelectValue placeholder="Selecione a clínica" />
                            </SelectTrigger>
                            <SelectContent>
                              {isLoadingClinicas ? (
                                <SelectItem value="loading" disabled>
                                  Carregando...
                                </SelectItem>
                              ) : clinicas.length === 0 ? (
                                <SelectItem value="empty" disabled>
                                  Nenhuma clínica cadastrada
                                </SelectItem>
                              ) : (
                                clinicas.map((clinica) => (
                                  <SelectItem
                                    key={clinica.id}
                                    value={clinica.nome}
                                  >
                                    {clinica.nome}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          {errors.clinica && (
                            <p className="text-xs text-destructive">
                              {errors.clinica.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label
                            htmlFor="rpv"
                            className="text-sm font-medium text-foreground"
                          >
                            RPV <span className="text-destructive">*</span>
                          </label>
                          <Input
                            id="rpv"
                            placeholder="Digite o RPV"
                            {...register("rpv")}
                            className={errors.rpv ? "border-destructive" : ""}
                          />
                          {errors.rpv && (
                            <p className="text-xs text-destructive">
                              {errors.rpv.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="flex justify-between border-t bg-muted/50 py-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePrevious}
                        className="gap-2"
                      >
                        <ChevronLeft className="h-4 w-4" /> Voltar
                      </Button>
                      <Button
                        type="submit"
                        disabled={!isStep7Valid}
                        className="gap-2"
                      >
                        Próximo <ChevronRight className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </form>
                </motion.div>
              )}

              {/* PASSO 8: TREINAMENTOS */}
              {step === 8 && !showSuccess && (
                <motion.div
                  key="step8"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 },
                  }}
                >
                  <CardHeader className="pb-8">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <GraduationCap className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Treinamentos</CardTitle>
                        <CardDescription>
                          Capacitação do colaborador (Etapa 8 - Segurança)
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <form onSubmit={handleSubmit(onSubmitFinal)}>
                    <CardContent className="space-y-8 py-4">
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <label
                            htmlFor="treinamento"
                            className="text-sm font-medium text-foreground"
                          >
                            Treinamento{" "}
                            <span className="text-destructive">*</span>
                          </label>
                          <Select
                            value={treinamentoValue}
                            onValueChange={(
                              value: "Concluído" | "Em Andamento" | "Pendente",
                            ) =>
                              setValue("treinamento", value, {
                                shouldValidate: true,
                              })
                            }
                          >
                            <SelectTrigger
                              className={
                                errors.treinamento ? "border-destructive" : ""
                              }
                            >
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Concluído">
                                Concluído
                              </SelectItem>
                              <SelectItem value="Em Andamento">
                                Em Andamento
                              </SelectItem>
                              <SelectItem value="Pendente">Pendente</SelectItem>
                            </SelectContent>
                          </Select>
                          {errors.treinamento && (
                            <p className="text-xs text-destructive">
                              {errors.treinamento.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label
                            htmlFor="realizarTreinamento"
                            className="text-sm font-medium text-foreground"
                          >
                            Realizar Treinamento{" "}
                            <span className="text-destructive">*</span>
                          </label>
                          <Select
                            value={realizarTreinamentoValue}
                            onValueChange={(
                              value: "Sim" | "Não" | "Pendente",
                            ) =>
                              setValue("realizarTreinamento", value, {
                                shouldValidate: true,
                              })
                            }
                          >
                            <SelectTrigger
                              className={
                                errors.realizarTreinamento
                                  ? "border-destructive"
                                  : ""
                              }
                            >
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Sim">Sim</SelectItem>
                              <SelectItem value="Não">Não</SelectItem>
                              <SelectItem value="Pendente">Pendente</SelectItem>
                            </SelectContent>
                          </Select>
                          {errors.realizarTreinamento && (
                            <p className="text-xs text-destructive">
                              {errors.realizarTreinamento.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="localTreinamento"
                          className="text-sm font-medium text-foreground"
                        >
                          Local do Treinamento{" "}
                          <span className="text-destructive">*</span>
                        </label>
                        <Input
                          id="localTreinamento"
                          placeholder="Digite o local do treinamento"
                          {...register("localTreinamento")}
                          className={
                            errors.localTreinamento ? "border-destructive" : ""
                          }
                        />
                        {errors.localTreinamento && (
                          <p className="text-xs text-destructive">
                            {errors.localTreinamento.message}
                          </p>
                        )}
                      </div>
                    </CardContent>

                    <CardFooter className="flex justify-between border-t bg-muted/50 py-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePrevious}
                        className="gap-2"
                      >
                        <ChevronLeft className="h-4 w-4" /> Voltar
                      </Button>
                      <Button
                        type="submit"
                        disabled={!isStep8Valid || createMutation.isPending}
                        className="gap-2 bg-green-600 hover:bg-green-700"
                      >
                        {createMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />{" "}
                            Salvando...
                          </>
                        ) : (
                          <>
                            Finalizar Cadastro{" "}
                            <CheckCircle className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </form>
                </motion.div>
              )}

              {/* TELA DE SUCESSO */}
              {step === 8 && showSuccess && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="flex flex-col items-center justify-center py-16"
                >
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-500/20">
                    <CheckCircle className="h-12 w-12 text-green-500" />
                  </div>
                  <h2 className="mt-6 text-2xl font-bold text-foreground">
                    Cadastro Finalizado!
                  </h2>
                  <p className="mt-2 text-center text-muted-foreground">
                    O colaborador foi cadastrado com sucesso.
                    <br />
                    Redirecionando...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* Informações Adicionais */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Todos os campos marcados com{" "}
              <span className="text-destructive">*</span> são obrigatórios.
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
