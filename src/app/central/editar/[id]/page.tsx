"use client";

/**
 * ============================================================================
 * /central/editar/[id] — Formulário de Edição de Colaborador
 * ============================================================================
 *
 * Padrão visual idêntico ao /configuracoes:
 *   Card glass-card
 *     Tabs
 *       CardHeader → TabsList (w-full, bg-transparent, border-b)
 *       CardContent p-6
 *         TabsContent mt-10 space-y-8
 *           h2 com ícone
 *           grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8
 *             div space-y-2 → label + Input / Select
 *
 * Fix de runtime Radix Select:
 *   Nenhum <SelectItem value=""> — causa erro em produção.
 *   O trigger recebe value={field || undefined} para exibir o placeholder
 *   quando o campo está vazio, sem precisar de um item vazio na lista.
 */

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  User,
  Truck,
  Stethoscope,
  ClipboardList,
  UserCircle,
  MapPin,
  Activity,
  CalendarCheck,
  Shield,
  GraduationCap,
  Briefcase,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { colaboradoresApi, clinicasApi, type Colaborador } from "@/lib/axios";
import { maskCPF, formatTelefone } from "@/lib/utils";
import { IMaskInput } from "react-imask";
import { CargoCombobox } from "@/components/CargoCombobox";
import { PassagemForm } from "@/components/PassagemForm";
import { HospedagemForm } from "@/components/HospedagemForm";
import { AlimentacaoForm } from "@/components/AlimentacaoForm";
import { TreinamentosTable } from "@/components/TreinamentosTable";
import { ESCOLARIDADE_OPTIONS, EXPERIENCIA_FUNCAO_OPTIONS } from "@/constants/rh-profile";

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

type FormData = Omit<Colaborador, "progresso" | "_rowIndex">;

const DATE_FIELDS_PAGE = new Set([
  "DT_NASCIMENTO",
  "DATA_ADMISSAO",
  "TERMINO",
  "PRORROGACAO",
  "DEMISSAO",
]);

/**
 * Normaliza qualquer valor de data para "YYYY-MM-DD" ou "".
 * Trata serial numérico do Excel/Sheets, DD/MM/YYYY, ISO e strings vazias.
 */
function parseExcelDate(val: unknown): string {
  if (val === null || val === undefined || val === "") return "";
  const str = String(val).trim();
  if (str === "") return "";
  // Serial numérico do Excel
  if (/^\d+$/.test(str)) {
    return new Date((parseInt(str, 10) - 25569) * 86400 * 1000)
      .toISOString()
      .split("T")[0];
  }
  // Padrão brasileiro DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [dd, mm, yyyy] = str.split("/");
    return `${yyyy}-${mm}-${dd}`;
  }
  // ISO ou qualquer outro — fatia a parte da data
  return str.split("T")[0];
}

const EMPTY: FormData = {
  NOME: "",
  CPF: "",
  RE: "",
  FUNCAO_CLT: "",
  IDADE: null,
  DT_NASCIMENTO: "",
  MUNICIPIO: "",
  UF: "",
  TELEFONE: "",
  STATUS: "",
  IND: "",
  PESSOA: "",
  SEXO: "",
  REQ: "",
  VINCULADO: "",
  OP: "",
  HISTOGRAMA: "",
  ENVIADO_RH: "",
  CARTA_OFERTA: "",
  COLAB_PEND: "",
  EXAME: "",
  CLINICA: "",
  DOCS: "",
  ASO: "",
  RPV: "",
  PRE_ADMISSAO: "",
  MOB: "",
  DATA_ADMISSAO: "",
  TIPO_CONTRATO: "",
  CONTRATO: "",
  PORTAL: "",
  CRACHA: "",
  PONTO: "",
  VR: "",
  FRETADO: "",
  TERMINO: "",
  PRORROGACAO: "",
  DEMISSAO: "",
  TREINAMENTO: "",
  REALIZAR_TREINAMENTO: "",
  LOCAL_TREINAMENTO: "",
  NUMERO_ORACLE: null,
  ESCOLARIDADE: "",
  EXPERIENCIA_FUNCAO: "",
};

// ─────────────────────────────────────────────────────────────────────────────
// OPÇÕES DE SELECT (nenhuma string vazia — regra do Radix UI)
// ─────────────────────────────────────────────────────────────────────────────

const O_STATUS = ["Ativo", "Pendente", "Desistente", "Desligado", "Restrição Cliente"];
const O_SIM_NAO = ["Sim", "Não"];
const O_SIM_NAO_PENDENTE = ["Sim", "Não", "Pendente"];
const O_APTO = ["Apto", "Inapto", "Pendente"];
const O_PORTAL = ["Liberado", "Pendente", "Bloqueado"];
const O_CRACHA = ["Emitido", "Pendente"];
const O_DOCS = ["Completo", "Incompleto", "Pendente"];
const O_EXAME = ["Realizado", "Agendado", "Pendente"];
const O_CARTA = ["Sim", "Não", "Pendente"];
const O_ADMISSAO = ["Concluída", "Em andamento", "Pendente"];
const O_CONTRATO = ["CLT", "PJ", "Temporário", "Estagiário"];
const O_TIPO_CONTRATO = ["Determinado", "Indeterminado"];
const O_PONTO = ["Cadastrado", "Pendente"];
const O_TREINAMENTO = ["Concluído", "Em Andamento", "Pendente"];
const O_FRETADO = ["Sim", "Não", "Não aplica"];
const O_PESSOA = ["Masculino", "Feminino"];
const O_PRE_ADMISSAO = ["Sim", "Não", "Pendente"];
const O_ESCOLARIDADE = [...ESCOLARIDADE_OPTIONS];
const O_EXPERIENCIA_FUNCAO = [...EXPERIENCIA_FUNCAO_OPTIONS];
const O_UF = [
  "AC",
  "AL",
  "AM",
  "AP",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MG",
  "MS",
  "MT",
  "PA",
  "PB",
  "PE",
  "PI",
  "PR",
  "RJ",
  "RN",
  "RO",
  "RR",
  "RS",
  "SC",
  "SE",
  "SP",
  "TO",
];

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTES BASE (padrão /configuracoes)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Campo de texto — idêntico ao padrão do /configuracoes.
 * className="glass-input" + label acima.
 */
function F({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  readOnly,
}: {
  label: string;
  value: string | number | null | undefined;
  onChange?: (v: string) => void;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Input
        type={type}
        value={value ?? ""} /* blindagem: nunca null/undefined */
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder ?? label}
        readOnly={readOnly}
        className={`glass-input ${readOnly ? "opacity-50 cursor-default pointer-events-none" : ""}`}
      />
    </div>
  );
}

/**
 * Select blindado.
 *
 * Fix do erro Radix "A <Select.Item /> must have a value prop that is not an empty string":
 *   — Nenhum <SelectItem> recebe value="".
 *   — O <Select> recebe value={campo || undefined} para que o placeholder apareça
 *     quando o campo está vazio (undefined = modo placeholder do Radix).
 */
function S({
  label,
  value,
  onChange,
  options,
  emptyLabel = "Nenhuma opção disponível",
}: {
  label: string;
  value: string | null | undefined;
  onChange: (v: string) => void;
  options: string[];
  emptyLabel?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Select
        value={
          value || undefined
        } /* "" e null viram undefined → exibe placeholder */
        onValueChange={onChange}
      >
        <SelectTrigger className="glass-input w-full">
          <SelectValue placeholder="Selecionar…" />
        </SelectTrigger>
        <SelectContent>
          {/* Nenhum SelectItem com value="" aqui */}
          {options.length === 0 ? (
            <SelectItem value="__empty__" disabled>
              {emptyLabel}
            </SelectItem>
          ) : (
            options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Sub-título de seção dentro de uma aba — mesmo estilo do /configuracoes */
function SectionTitle({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
        {icon}
        {title}
      </h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA
// ─────────────────────────────────────────────────────────────────────────────

export default function EditarColaboradorPage() {
  const queryClient = useQueryClient();
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const id = decodeURIComponent(params.id ?? "");

  const [form, setForm] = useState<FormData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { data: clinicas = [], isLoading: isLoadingClinicas } = useQuery({
    queryKey: ["clinicas"],
    queryFn: async () => {
      const response = await clinicasApi.listar();
      return response.data;
    },
  });

  // ── setters ─────────────────────────────────────────────────────────────

  const set = useCallback(
    <K extends keyof FormData>(k: K, v: FormData[K]) =>
      setForm((p) => ({ ...p, [k]: v })),
    [],
  );
  const t = useCallback(
    (k: keyof FormData) => (v: string) => set(k, (v || null) as never),
    [set],
  );
  const s = useCallback(
    (k: keyof FormData) => (v: string) => set(k, (v || null) as never),
    [set],
  );

  const clinicaOptions = [
    ...new Set(
      [
        form.CLINICA?.trim() || null,
        ...clinicas.map((clinica) => clinica.nome?.trim()).filter(Boolean),
      ].filter((nome): nome is string => Boolean(nome)),
    ),
  ];

  // ── fetch ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    colaboradoresApi
      .buscar(id)
      .then((res) => {
        const d = res.data?.data;
        if (!d) {
          setLoadError("Colaborador não encontrado.");
          return;
        }
        // Blindagem: garante que nenhum campo venha undefined.
        // Campos de data são normalizados para YYYY-MM-DD (evita warning do DOM).
        setForm({
          ...EMPTY,
          ...Object.fromEntries(
            Object.entries(d).map(([k, v]) => [
              k,
              DATE_FIELDS_PAGE.has(k) ? parseExcelDate(v) : (v ?? ""),
            ]),
          ),
        } as FormData);
      })
      .catch(() => setLoadError("Erro ao carregar. Tente novamente."))
      .finally(() => setLoading(false));
  }, [id]);

  // ── salvar ───────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.NOME?.trim()) {
      toast.error("Nome é obrigatório.");
      return;
    }
    setSaving(true);
    try {
      await colaboradoresApi.atualizar(id, form);
      toast.success("Dados salvos com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["colaboradores"], type: "all" });
      queryClient.invalidateQueries({ queryKey: ["dashboard-principal"], type: "all" });
      queryClient.invalidateQueries({ queryKey: ["dashboard-rh"], type: "all" });
      setSaved(true);
      setTimeout(() => router.push("/central"), 900);
    } catch {
      toast.error("Erro ao salvar. Verifique e tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  // ── loading / erro ───────────────────────────────────────────────────────

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-40">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando dados…</p>
      </div>
    );

  if (loadError)
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-40">
        <AlertCircle className="h-10 w-10 text-destructive/60" />
        <p className="font-medium">{loadError}</p>
        <Button
          variant="outline"
          onClick={() => router.push("/central")}
          className="gap-2 mt-2"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para Central
        </Button>
      </div>
    );

  // ── render ───────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-6xl mx-auto p-6 md:p-8">
      {/* ══ HEADER (idêntico ao mb-8 do /configuracoes) ══════════════════ */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/central")}
            className="h-9 w-9 border border-border bg-card/60 hover:bg-card"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {form.NOME?.trim() || "Editar Colaborador"}
            </h1>
            <p className="text-muted-foreground">
              Edição de dados cadastrais · CPF {maskCPF(form.CPF) || "—"}
            </p>
          </div>
        </div>

        {/* Botões direita */}
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/central")}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || saved}
            className="gap-2"
            style={{ backgroundColor: "#ff460a", borderColor: "#ff460a" }}
          >
            {saved ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Salvo!
              </>
            ) : saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ══ CARD glass-card (idêntico ao /configuracoes) ═════════════════ */}
      <Card className="glass-card">
        <Tabs defaultValue="rh" className="w-full">
          {/* TabsList idêntico ao padrão */}
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
                <Shield className="w-4 h-4 mr-2" />
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
            {/* ════════════════════════════════════════════════════════════
                ABA 1 — DADOS PESSOAIS & CONTRATO
            ════════════════════════════════════════════════════════════ */}
            <TabsContent value="rh" className="w-full mt-10 space-y-8">
              <SectionTitle
                icon={<UserCircle className="w-5 h-5 text-primary" />}
                title="Identificação"
                description="Dados básicos de identificação do colaborador"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <F
                  label="Nome Completo *"
                  value={form.NOME}
                  onChange={t("NOME")}
                  placeholder="Nome completo do colaborador"
                />
                <F
                  label="CPF"
                  value={maskCPF(form.CPF)}
                  onChange={t("CPF")}
                  placeholder="000.000.000-00"
                  readOnly
                />
                <F
                  label="RE (Registro)"
                  value={form.RE}
                  onChange={t("RE")}
                  placeholder="Número de registro"
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium">Função / Cargo CLT</label>
                  <CargoCombobox
                    value={form.FUNCAO_CLT || undefined}
                    onChange={(value) => set("FUNCAO_CLT", value as never)}
                    placeholder="Selecione o cargo..."
                  />
                </div>
                <S
                  label="Escolaridade"
                  value={form.ESCOLARIDADE}
                  onChange={s("ESCOLARIDADE")}
                  options={O_ESCOLARIDADE}
                />
                <S
                  label="Experiência na função"
                  value={form.EXPERIENCIA_FUNCAO}
                  onChange={s("EXPERIENCIA_FUNCAO")}
                  options={O_EXPERIENCIA_FUNCAO}
                />
                <S
                  label="Sexo"
                  value={form.SEXO}
                  onChange={s("SEXO")}
                  options={O_PESSOA}
                />
                <F
                  label="Histograma"
                  value={form.HISTOGRAMA}
                  onChange={t("HISTOGRAMA")}
                  placeholder="Ex: Mecânico / Caldeireiro"
                />
                <F
                  label="Nº Pessoa"
                  value={form.NUMERO_ORACLE}
                  onChange={(v) => set("NUMERO_ORACLE", v ? parseInt(v, 10) : null)}
                  type="number"
                  placeholder="Número Oracle"
                />
              </div>

              <SectionTitle
                icon={<MapPin className="w-5 h-5 text-primary" />}
                title="Localização & Contato"
                description="Endereço e informações de contato"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <F
                  label="Município"
                  value={form.MUNICIPIO}
                  onChange={t("MUNICIPIO")}
                  placeholder="Cidade de residência"
                />
                <S
                  label="UF"
                  value={form.UF}
                  onChange={s("UF")}
                  options={O_UF}
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium">Telefone</label>
                  <IMaskInput
                    mask="(00) 00000-0000"
                    placeholder="(00) 00000-0000"
                    value={formatTelefone(form.TELEFONE)}
                    onAccept={(value: string) => set("TELEFONE", value || "")}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <F
                  label="Idade"
                  value={form.IDADE?.toString() ?? ""}
                  onChange={(v) => set("IDADE", v ? parseInt(v) : null)}
                  type="number"
                  placeholder="Ex: 30"
                />
                <F
                  label="Data de Nascimento"
                  value={form.DT_NASCIMENTO}
                  onChange={t("DT_NASCIMENTO")}
                  type="date"
                />
              </div>

              <SectionTitle
                icon={<CalendarCheck className="w-5 h-5 text-primary" />}
                title="Contrato & Admissão"
                description="Dados contratuais e datas de vínculo"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <S
                  label="Status"
                  value={form.STATUS}
                  onChange={s("STATUS")}
                  options={O_STATUS}
                />
                <S
                  label="Tipo de Contrato"
                  value={form.TIPO_CONTRATO}
                  onChange={s("TIPO_CONTRATO")}
                  options={O_TIPO_CONTRATO}
                />
                <S
                  label="Contrato"
                  value={form.CONTRATO}
                  onChange={s("CONTRATO")}
                  options={O_CONTRATO}
                />
                <F
                  label="Data de Admissão"
                  value={form.DATA_ADMISSAO}
                  onChange={t("DATA_ADMISSAO")}
                  type="date"
                />
                <F
                  label="Término do Contrato"
                  value={form.TERMINO}
                  onChange={t("TERMINO")}
                  type="date"
                />
                <F
                  label="Prorrogação"
                  value={form.PRORROGACAO}
                  onChange={(v) => {
                    // Ao preencher prorrogação, limpa o término original
                    set("PRORROGACAO", v || null);
                    if (v) set("TERMINO", null);
                  }}
                  type="date"
                />
                <F
                  label="Data de Demissão"
                  value={form.DEMISSAO}
                  onChange={t("DEMISSAO")}
                  type="date"
                />
                <S
                  label="Enviado RH"
                  value={form.ENVIADO_RH}
                  onChange={s("ENVIADO_RH")}
                  options={O_SIM_NAO_PENDENTE}
                />
                <S
                  label="Carta Oferta"
                  value={form.CARTA_OFERTA}
                  onChange={s("CARTA_OFERTA")}
                  options={O_SIM_NAO_PENDENTE}
                />
                <S
                  label="Pré-Admissão"
                  value={form.PRE_ADMISSAO}
                  onChange={s("PRE_ADMISSAO")}
                  options={O_PRE_ADMISSAO}
                />
                <S
                  label="Vinculado"
                  value={form.VINCULADO}
                  onChange={s("VINCULADO")}
                  options={O_SIM_NAO}
                />
              </div>

              <SectionTitle
                icon={<Activity className="w-5 h-5 text-primary" />}
                title="Benefícios & Documentação"
                description="Benefícios e status da documentação do colaborador"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <S
                  label="Documentação"
                  value={form.DOCS}
                  onChange={s("DOCS")}
                  options={O_DOCS}
                />
                <S
                  label="Crachá"
                  value={form.CRACHA}
                  onChange={s("CRACHA")}
                  options={O_CRACHA}
                />
                <S
                  label="Ponto"
                  value={form.PONTO}
                  onChange={s("PONTO")}
                  options={O_PONTO}
                />
                <S
                  label="VR (Vale Refeição)"
                  value={form.VR === "Ativo" ? "Sim" : form.VR === "Pendente" ? "Não" : undefined}
                  onChange={(v) => set("VR", v === "Sim" ? "Ativo" : "Pendente")}
                  options={["Sim", "Não"]}
                />
                <S
                  label="Fretado"
                  value={form.FRETADO}
                  onChange={s("FRETADO")}
                  options={O_FRETADO}
                />
                <F
                  label="INDICAÇÃO"
                  value={form.IND}
                  onChange={t("IND")}
                  placeholder="Responsável pela indicação"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={saving || saved}
                  className="gap-2"
                  style={{ backgroundColor: "#ff460a", borderColor: "#ff460a" }}
                >
                  <Save className="w-4 h-4" />
                  Salvar Alterações
                </Button>
              </div>
            </TabsContent>

            {/* ════════════════════════════════════════════════════════════
                ABA 2 — LOGÍSTICA
            ════════════════════════════════════════════════════════════ */}
            <TabsContent value="logistica" className="w-full mt-10 space-y-8">
              <PassagemForm colaboradorId={id} />
              <HospedagemForm colaboradorId={id} />
              <AlimentacaoForm colaboradorId={id} />
            </TabsContent>

            {/* ════════════════════════════════════════════════════════════
                ABA 3 — SAÚDE & TREINAMENTOS
            ════════════════════════════════════════════════════════════ */}
            <TabsContent value="seguranca" className="w-full mt-10 space-y-8">
              <SectionTitle
                icon={<Stethoscope className="w-5 h-5 text-[#337246]" />}
                title="Exames & Documentação Médica"
                description="Acompanhamento de exames admissionais e documentação de saúde"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <S
                  label="Exame"
                  value={form.EXAME}
                  onChange={s("EXAME")}
                  options={O_EXAME}
                />
                <S
                  label="Clínica"
                  value={form.CLINICA}
                  onChange={s("CLINICA")}
                  options={clinicaOptions}
                  emptyLabel={isLoadingClinicas ? "Carregando..." : "Nenhuma clínica cadastrada"}
                />
                <S
                  label="ASO"
                  value={form.ASO}
                  onChange={s("ASO")}
                  options={O_APTO}
                />
                <S
                  label="RPV"
                  value={form.RPV}
                  onChange={s("RPV")}
                  options={O_SIM_NAO}
                />
              </div>

              <SectionTitle
                icon={<GraduationCap className="w-5 h-5 text-[#337246]" />}
                title="Treinamentos Normativos"
                description="Controle dos treinamentos obrigatórios com datas de realização e validade"
              />
              <TreinamentosTable colaboradorId={id} />
            </TabsContent>

            {/* ════════════════════════════════════════════════════════════
                ABA 4 — OUTROS
            ════════════════════════════════════════════════════════════ */}
            <TabsContent value="outros" className="w-full mt-10 space-y-8">
              <SectionTitle
                icon={<ClipboardList className="w-5 h-5 text-slate-500" />}
                title="Controle Administrativo"
                description="Campos operacionais diversos"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <S
                  label="MOB"
                  value={form.MOB}
                  onChange={s("MOB")}
                  options={O_SIM_NAO_PENDENTE}
                />
                <F
                  label="OP (Ordem de Produção)"
                  value={form.OP}
                  onChange={t("OP")}
                  placeholder="Nº da OP"
                />
                <F
                  label="REQ (Requisição)"
                  value={form.REQ}
                  onChange={t("REQ")}
                  placeholder="Nº da Requisição"
                />
                <S
                  label="Colaborador Pendente"
                  value={form.COLAB_PEND}
                  onChange={s("COLAB_PEND")}
                  options={O_SIM_NAO}
                />
                <S
                  label="Portal"
                  value={form.PORTAL}
                  onChange={s("PORTAL")}
                  options={O_PORTAL}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={saving || saved}
                  className="gap-2"
                  style={{ backgroundColor: "#ff460a", borderColor: "#ff460a" }}
                >
                  <Save className="w-4 h-4" />
                  Salvar Alterações
                </Button>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
