"use client";

/**
 * ============================================================================
 * /central/editar/[cpf] — Formulário de Edição / Cadastro de Colaborador
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
  Package,
  UserCircle,
  MapPin,
  Activity,
  CalendarCheck,
  Shield,
  GraduationCap,
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

import { colaboradoresApi, type Colaborador } from "@/lib/axios";
import { CARGOS } from "@/constants/cargos";

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
  CONTRATO: "",
  PORTAL: "",
  CRACHA: "",
  PONTO: "",
  VR: "",
  TERMINO: "",
  PRORROGACAO: "",
  DEMISSAO: "",
  TREINAMENTO: "",
  REALIZAR_TREINAMENTO: "",
  LOCAL_TREINAMENTO: "",
};

// ─────────────────────────────────────────────────────────────────────────────
// OPÇÕES DE SELECT (nenhuma string vazia — regra do Radix UI)
// ─────────────────────────────────────────────────────────────────────────────

const O_STATUS = ["Ativo", "Pendente", "Inativo", "Desligado"];
const O_SIM_NAO = ["Sim", "Não"];
const O_APTO = ["Apto", "Inapto", "Pendente"];
const O_LIBERADO = ["Liberado", "Pendente", "Bloqueado"];
const O_DOCS = ["Completo", "Incompleto", "Pendente"];
const O_EXAME = ["Agendado", "Realizado", "Pendente", "Inapto"];
const O_CARTA = ["Enviada", "Assinada", "Pendente"];
const O_ADMISSAO = ["Concluída", "Em andamento", "Pendente"];
const O_CONTRATO = ["Assinado", "Pendente", "Cancelado"];
const O_PONTO = ["Cadastrado", "Pendente"];
const O_TREINAMENTO = ["Concluído", "Em andamento", "Pendente", "Não aplica"];
const O_PESSOA = ["CLT", "Temporário", "Terceiro", "Estagiário"];
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
}: {
  label: string;
  value: string | null | undefined;
  onChange: (v: string) => void;
  options: string[];
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
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
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
  const params = useParams<{ cpf: string }>();
  const router = useRouter();

  const rawCpf = decodeURIComponent(params.cpf ?? "");
  const isNovo = rawCpf === "novo";
  const cpfClean = rawCpf.replace(/\D/g, "");

  const [form, setForm] = useState<FormData>(EMPTY);
  const [loading, setLoading] = useState(!isNovo);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  // ── fetch ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isNovo || !cpfClean) return;
    setLoading(true);
    colaboradoresApi
      .buscar(cpfClean)
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
  }, [cpfClean, isNovo]);

  // ── salvar ───────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.NOME?.trim()) {
      toast.error("Nome é obrigatório.");
      return;
    }
    setSaving(true);
    try {
      if (isNovo) {
        await colaboradoresApi.criar(form);
        toast.success("Colaborador cadastrado com sucesso!");
      } else {
        await colaboradoresApi.atualizar(cpfClean, form);
        toast.success("Dados salvos com sucesso!");
      }
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
              {isNovo
                ? "Novo Colaborador"
                : form.NOME?.trim() || `CPF ${cpfClean}`}
            </h1>
            <p className="text-muted-foreground">
              {isNovo
                ? "Preencha os dados abaixo para cadastrar um novo colaborador"
                : `Edição de dados cadastrais · CPF ${cpfClean}`}
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
            style={{ backgroundColor: "#5bc0ec", borderColor: "#5bc0ec" }}
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
        <Tabs defaultValue="pessoal" className="w-full">
          {/* TabsList idêntico ao padrão */}
          <CardHeader className="pb-0">
            <TabsList className="w-full flex justify-start gap-2 bg-transparent border-b border-border/50 pb-2 rounded-none h-auto">
              <TabsTrigger
                value="pessoal"
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <User className="w-4 h-4 mr-2" />
                Dados Pessoais
              </TabsTrigger>
              <TabsTrigger
                value="logistica"
                className="data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-400"
              >
                <Truck className="w-4 h-4 mr-2" />
                Logística
              </TabsTrigger>
              <TabsTrigger
                value="saude"
                className="data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400"
              >
                <Stethoscope className="w-4 h-4 mr-2" />
                Saúde &amp; Treinamentos
              </TabsTrigger>
              <TabsTrigger
                value="suprimentos"
                className="data-[state=active]:bg-violet-500/10 data-[state=active]:text-violet-400"
              >
                <Package className="w-4 h-4 mr-2" />
                Suprimentos
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="p-6">
            {/* ════════════════════════════════════════════════════════════
                ABA 1 — DADOS PESSOAIS & CONTRATO
            ════════════════════════════════════════════════════════════ */}
            <TabsContent value="pessoal" className="w-full mt-10 space-y-8">
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
                  value={form.CPF}
                  onChange={t("CPF")}
                  placeholder="000.000.000-00"
                  readOnly={!isNovo}
                />
                <F
                  label="RE (Registro)"
                  value={form.RE}
                  onChange={t("RE")}
                  placeholder="Número de registro"
                />
                <S
                  label="Função / Cargo CLT"
                  value={form.FUNCAO_CLT}
                  onChange={s("FUNCAO_CLT")}
                  options={CARGOS as unknown as string[]}
                />
                <S
                  label="Tipo de Pessoa"
                  value={form.PESSOA}
                  onChange={s("PESSOA")}
                  options={O_PESSOA}
                />
                <F
                  label="Histograma"
                  value={form.HISTOGRAMA}
                  onChange={t("HISTOGRAMA")}
                  placeholder="Ex: Mecânico / Caldeireiro"
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
                <F
                  label="Telefone"
                  value={form.TELEFONE}
                  onChange={t("TELEFONE")}
                  placeholder="(00) 00000-0000"
                />
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
                icon={<Activity className="w-5 h-5 text-primary" />}
                title="Status & Indicadores"
                description="Situação operacional e vínculos do colaborador"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <S
                  label="Status"
                  value={form.STATUS}
                  onChange={s("STATUS")}
                  options={O_STATUS}
                />
                <F
                  label="IND"
                  value={form.IND}
                  onChange={t("IND")}
                  placeholder="Indicador"
                />
                <F
                  label="REQ"
                  value={form.REQ}
                  onChange={t("REQ")}
                  placeholder="Nº da Requisição"
                />
                <S
                  label="Vinculado"
                  value={form.VINCULADO}
                  onChange={s("VINCULADO")}
                  options={O_SIM_NAO}
                />
                <F
                  label="OP"
                  value={form.OP}
                  onChange={t("OP")}
                  placeholder="Ordem de produção"
                />
              </div>

              <SectionTitle
                icon={<CalendarCheck className="w-5 h-5 text-primary" />}
                title="Contrato & Datas"
                description="Datas de admissão, término e encerramento contratual"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                  onChange={t("PRORROGACAO")}
                  type="date"
                />
                <F
                  label="Data de Demissão"
                  value={form.DEMISSAO}
                  onChange={t("DEMISSAO")}
                  type="date"
                />
                <S
                  label="Contrato"
                  value={form.CONTRATO}
                  onChange={s("CONTRATO")}
                  options={O_CONTRATO}
                />
                <S
                  label="VR (Vale Refeição)"
                  value={form.VR}
                  onChange={s("VR")}
                  options={O_SIM_NAO}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={saving || saved}
                  className="gap-2"
                  style={{ backgroundColor: "#5bc0ec", borderColor: "#5bc0ec" }}
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
              <SectionTitle
                icon={<Truck className="w-5 h-5 text-amber-400" />}
                title="Mobilização & Envios"
                description="Controle de mobilização e documentação enviada ao colaborador"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <S
                  label="MOB"
                  value={form.MOB}
                  onChange={s("MOB")}
                  options={O_SIM_NAO}
                />
                <S
                  label="Enviado RH"
                  value={form.ENVIADO_RH}
                  onChange={s("ENVIADO_RH")}
                  options={O_SIM_NAO}
                />
                <S
                  label="Carta Oferta"
                  value={form.CARTA_OFERTA}
                  onChange={s("CARTA_OFERTA")}
                  options={O_CARTA}
                />
                <S
                  label="Colaborador Pendente"
                  value={form.COLAB_PEND}
                  onChange={s("COLAB_PEND")}
                  options={O_SIM_NAO}
                />
              </div>

              <SectionTitle
                icon={<Shield className="w-5 h-5 text-amber-400" />}
                title="Credenciais & Acesso"
                description="Status de liberação de acesso físico e digital"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <S
                  label="Portal"
                  value={form.PORTAL}
                  onChange={s("PORTAL")}
                  options={O_LIBERADO}
                />
                <S
                  label="Crachá"
                  value={form.CRACHA}
                  onChange={s("CRACHA")}
                  options={O_LIBERADO}
                />
                <S
                  label="Ponto"
                  value={form.PONTO}
                  onChange={s("PONTO")}
                  options={O_PONTO}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={saving || saved}
                  className="gap-2"
                  style={{ backgroundColor: "#5bc0ec", borderColor: "#5bc0ec" }}
                >
                  <Save className="w-4 h-4" />
                  Salvar Alterações
                </Button>
              </div>
            </TabsContent>

            {/* ════════════════════════════════════════════════════════════
                ABA 3 — SAÚDE & TREINAMENTOS
            ════════════════════════════════════════════════════════════ */}
            <TabsContent value="saude" className="w-full mt-10 space-y-8">
              <SectionTitle
                icon={<Stethoscope className="w-5 h-5 text-emerald-400" />}
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
                <F
                  label="Clínica"
                  value={form.CLINICA}
                  onChange={t("CLINICA")}
                  placeholder="Nome da clínica responsável"
                />
                <S
                  label="Documentação (DOCs)"
                  value={form.DOCS}
                  onChange={s("DOCS")}
                  options={O_DOCS}
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
                <S
                  label="Pré-Admissão"
                  value={form.PRE_ADMISSAO}
                  onChange={s("PRE_ADMISSAO")}
                  options={O_ADMISSAO}
                />
              </div>

              <SectionTitle
                icon={<GraduationCap className="w-5 h-5 text-emerald-400" />}
                title="Treinamentos Normativos"
                description="Status e localização dos treinamentos obrigatórios"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <S
                  label="Status do Treinamento"
                  value={form.TREINAMENTO}
                  onChange={s("TREINAMENTO")}
                  options={O_TREINAMENTO}
                />
                <S
                  label="Realizar Treinamento"
                  value={form.REALIZAR_TREINAMENTO}
                  onChange={s("REALIZAR_TREINAMENTO")}
                  options={O_SIM_NAO}
                />
                <F
                  label="Local do Treinamento"
                  value={form.LOCAL_TREINAMENTO}
                  onChange={t("LOCAL_TREINAMENTO")}
                  placeholder="Ex: Sede Yara / MSV / Online"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={saving || saved}
                  className="gap-2"
                  style={{ backgroundColor: "#5bc0ec", borderColor: "#5bc0ec" }}
                >
                  <Save className="w-4 h-4" />
                  Salvar Alterações
                </Button>
              </div>
            </TabsContent>

            {/* ════════════════════════════════════════════════════════════
                ABA 4 — SUPRIMENTOS
            ════════════════════════════════════════════════════════════ */}
            <TabsContent value="suprimentos" className="w-full mt-10 space-y-8">
              <SectionTitle
                icon={<Package className="w-5 h-5 text-violet-400" />}
                title="Suprimentos"
                description="EPIs, uniforme e equipamentos do colaborador"
              />
              <div className="flex flex-col items-center justify-center gap-5 py-16 text-center rounded-xl border border-dashed border-border/60">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 ring-1 ring-violet-500/20">
                  <Package className="h-8 w-8 text-violet-400" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    Em Desenvolvimento
                  </p>
                  <p className="mt-1.5 text-sm text-muted-foreground max-w-md">
                    Os campos de <strong>EPIs</strong>,{" "}
                    <strong>Uniforme</strong> e <strong>Equipamentos</strong>{" "}
                    serão integrados quando as colunas correspondentes forem
                    adicionadas ao modelo de dados.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 mt-1">
                  {[
                    "EPIs",
                    "Uniforme",
                    "Notebook",
                    "Ferramentas",
                    "Crachá de Acesso",
                  ].map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-violet-500/20 bg-violet-500/5 px-3 py-1 text-xs text-violet-400"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
