"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_CONFIG } from "@/components/TreinamentosTable";
import {
  treinamentosApi,
  type Colaborador,
  type ColaboradorTreinamento,
} from "@/lib/axios";
import { maskCPF, formatTelefone } from "@/lib/utils";
import {
  User,
  Briefcase,
  ShieldCheck,
  Truck,
  Monitor,
  AlertCircle,
  CheckCircle,
  Clock,
  Calendar,
} from "lucide-react";

interface ColaboradorDetailsModalProps {
  colaborador: Colaborador | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Datas de treinamento já vêm como "YYYY-MM-DD" do banco (coluna date)
function formatarDataBR(value: string | null | undefined): string {
  if (!value) return "—";
  const iso = value.split("T")[0];
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

// Helper para normalizar datas seriais do Sheets para "YYYY-MM-DD"
function parseDisplayDate(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  const str = String(value).trim();
  if (str === "") return "-";
  if (/^\d+$/.test(str)) {
    const serial = Number(str);
    const date = new Date((serial - 25569) * 86400 * 1000);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return str.split("T")[0];
}

// Condensa a lista de treinamentos aplicáveis do colaborador em um rótulo único.
// Retorna null enquanto a query não resolveu — aí o Status Geral cai de volta
// para o campo legado `TREINAMENTO`.
function resumirTreinamentos(
  itens: ColaboradorTreinamento[] | undefined,
): { label: string; grupo: "ok" | "alerta" | "pendencia" } | null {
  if (!itens) return null;
  if (itens.length === 0) {
    return { label: "Treinamentos não cadastrados", grupo: "pendencia" };
  }
  const vencidos = itens.filter((t) => t.status === "Vencido").length;
  if (vencidos > 0) {
    return { label: `${vencidos} treinamento(s) vencido(s)`, grupo: "alerta" };
  }
  const aVencer = itens.filter((t) => t.status === "A Vencer").length;
  if (aVencer > 0) {
    return { label: `${aVencer} treinamento(s) a vencer`, grupo: "alerta" };
  }
  const ok = itens.filter((t) => t.status === "OK").length;
  if (ok === itens.length) {
    return { label: `Treinamentos em dia (${ok})`, grupo: "ok" };
  }
  return {
    label: `Treinamentos pendentes (${itens.length - ok} de ${itens.length})`,
    grupo: "pendencia",
  };
}

// Helper para determinar status geral
function calcularStatusGeral(
  colab: Colaborador,
  treinamentos: ReturnType<typeof resumirTreinamentos>,
) {
  const pendencias: string[] = [];
  const alertas: string[] = [];
  const ok: string[] = [];

  // Verificar ASO
  if (colab.ASO === "Apto") {
    ok.push("ASO Apto");
  } else if (colab.ASO === "Inapto") {
    alertas.push("ASO Inapto");
  } else {
    pendencias.push("Falta ASO");
  }

  // Verificar MOB
  if (colab.MOB?.trim()) {
    ok.push(`MOB: ${colab.MOB}`);
  } else {
    pendencias.push("MOB Pendente");
  }

  // Verificar Documentação
  if (colab.DOCS === "Completo") {
    ok.push("Documentação Completa");
  } else if (colab.DOCS === "Incompleto") {
    alertas.push("Documentação Incompleta");
  } else {
    pendencias.push("Documentação Pendente");
  }

  // Verificar Exame
  if (colab.EXAME === "Realizado") {
    ok.push("Exames Realizados");
  } else if (colab.EXAME === "Agendado") {
    alertas.push("Exames Agendados");
  } else {
    pendencias.push("Exames Pendentes");
  }

  // Verificar Portal
  if (colab.PORTAL === "Liberado") {
    ok.push("Portal Liberado");
  } else if (colab.PORTAL === "Bloqueado") {
    alertas.push("Portal Bloqueado");
  } else {
    pendencias.push("Portal Pendente");
  }

  // Verificar Treinamento — modelo relacional; cai no campo legado enquanto carrega
  if (treinamentos) {
    if (treinamentos.grupo === "ok") ok.push(treinamentos.label);
    else if (treinamentos.grupo === "alerta") alertas.push(treinamentos.label);
    else pendencias.push(treinamentos.label);
  } else if (colab.TREINAMENTO === "Concluído") {
    ok.push("Treinamento Concluído");
  } else if (colab.TREINAMENTO === "Em Andamento") {
    alertas.push("Treinamento em Andamento");
  } else {
    pendencias.push("Treinamento Pendente");
  }

  // Verificar Crachá
  if (colab.CRACHA === "Emitido") {
    ok.push("Crachá Emitido");
  } else {
    pendencias.push("Crachá Pendente");
  }

  // Verificar Ponto
  if (colab.PONTO === "Cadastrado") {
    ok.push("Ponto Cadastrado");
  } else {
    pendencias.push("Ponto Pendente");
  }

  // Calcular percentual
  const total = pendencias.length + alertas.length + ok.length;
  const percentual = total > 0 ? Math.round((ok.length / total) * 100) : 0;

  return { pendencias, alertas, ok, percentual };
}

// Componente de campo de informação
function InfoField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium wrap-break-word">{value}</span>
    </div>
  );
}

// Componente de seção
function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card flex flex-col gap-3 rounded-lg p-4">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </h4>
      {children}
    </div>
  );
}

export function ColaboradorDetailsModal({
  colaborador,
  open,
  onOpenChange,
}: ColaboradorDetailsModalProps) {
  // O conteúdo vive em um filho para que os hooks (useQuery) nunca fiquem
  // atrás deste early return.
  if (!colaborador) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-225 w-[95vw] max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <ColaboradorDetailsContent colaborador={colaborador} open={open} />
      </DialogContent>
    </Dialog>
  );
}

function ColaboradorDetailsContent({
  colaborador,
  open,
}: {
  colaborador: Colaborador;
  open: boolean;
}) {
  // Mesma queryKey da TreinamentosTable (tela de edição) — cache compartilhado
  const { data: treinamentos, isLoading: carregandoTreinamentos } = useQuery({
    queryKey: ["treinamentos", colaborador.id],
    queryFn: async () => {
      const response = await treinamentosApi.listarDoColaborador(colaborador.id!);
      return response.data.data ?? [];
    },
    enabled: open && !!colaborador.id,
  });

  // Só os treinamentos marcados como aplicáveis a este colaborador
  const aplicaveis = treinamentos
    ? [...treinamentos]
        .filter((t) => t.aplicavel)
        .sort((a, b) => (a.treinamento?.nome ?? "").localeCompare(b.treinamento?.nome ?? ""))
    : undefined;

  const statusGeral = calcularStatusGeral(colaborador, resumirTreinamentos(aplicaveis));

  return (
    <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-lg truncate">{colaborador.NOME}</p>
              <p className="text-sm font-normal text-muted-foreground truncate">
                {maskCPF(colaborador.CPF) || "—"} •{" "}
                {colaborador.FUNCAO_CLT || "Sem função"}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* STATUS GERAL */}
        <div className="mt-4 rounded-lg border border-border bg-linear-to-r from-primary/5 to-transparent p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary">
            <ShieldCheck className="h-4 w-4" />
            Status Geral
          </h3>

          <div className="mb-3">
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{statusGeral.percentual}%</span>
            </div>
            <Progress value={statusGeral.percentual} className="h-2" />
          </div>

          <div className="flex flex-col gap-2">
            {statusGeral.pendencias.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-medium text-amber-400 shrink-0">
                  Pendências:
                </span>
                {statusGeral.pendencias.map((p, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-400"
                  >
                    <Clock className="h-3 w-3" />
                    {p}
                  </Badge>
                ))}
              </div>
            )}

            {statusGeral.alertas.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-medium text-orange-400 shrink-0">
                  Alertas:
                </span>
                {statusGeral.alertas.map((a, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="gap-1 border-orange-500/30 bg-orange-500/10 text-orange-400"
                  >
                    <AlertCircle className="h-3 w-3" />
                    {a}
                  </Badge>
                ))}
              </div>
            )}

            {statusGeral.ok.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-medium text-[#337246] shrink-0">
                  Concluído:
                </span>
                {statusGeral.ok.slice(0, 3).map((o, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="gap-1 border-[#337246]/30 bg-[#337246]/10 text-[#337246]"
                  >
                    <CheckCircle className="h-3 w-3" />
                    {o}
                  </Badge>
                ))}
                {statusGeral.ok.length > 3 && (
                  <Badge
                    variant="outline"
                    className="border-[#337246]/30 text-[#337246]"
                  >
                    +{statusGeral.ok.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Grid de Informações */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Dados Pessoais */}
          <Section title="Dados Pessoais" icon={User}>
            <div className="grid grid-cols-2 gap-3">
              <InfoField label="CPF" value={maskCPF(colaborador.CPF) || "—"} />
              <InfoField label="RE" value={colaborador.RE || "-"} />
              <InfoField
                label="Idade"
                value={colaborador.IDADE ? `${colaborador.IDADE} anos` : "-"}
              />
              <InfoField
                label="Data Nasc."
                value={parseDisplayDate(colaborador.DT_NASCIMENTO)}
              />
              <InfoField
                label="Município"
                value={colaborador.MUNICIPIO || "-"}
              />
              <InfoField label="UF" value={colaborador.UF || "-"} />
              <InfoField label="Telefone" value={formatTelefone(colaborador.TELEFONE) || "-"} />
              <InfoField label="Pessoa" value={colaborador.PESSOA || "-"} />
            </div>
          </Section>

          {/* Dados Contratuais */}
          <Section title="Dados Contratuais" icon={Briefcase}>
            <div className="grid grid-cols-2 gap-3">
              <InfoField label="Status" value={colaborador.STATUS || "-"} />
              <InfoField label="Contrato" value={colaborador.CONTRATO || "-"} />
              <InfoField label="Função" value={colaborador.FUNCAO_CLT || "-"} />
              <InfoField
                label="Histograma"
                value={colaborador.HISTOGRAMA || "-"}
              />
              <InfoField
                label="Data Admissão"
                value={parseDisplayDate(colaborador.DATA_ADMISSAO)}
              />
              <InfoField
                label="Vinculado"
                value={colaborador.VINCULADO || "-"}
              />
            </div>
          </Section>

          {/* Sistemas */}
          <Section title="Sistemas" icon={Monitor}>
            <div className="flex flex-wrap gap-2">
              <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-muted/50 p-3 min-w-20 flex-1">
                <span className="text-xs text-muted-foreground">Portal</span>
                <Badge
                  variant="outline"
                  className={`${
                    colaborador.PORTAL === "Liberado"
                      ? "border-[#337246]/30 bg-[#337246]/10 text-[#337246]"
                      : colaborador.PORTAL === "Bloqueado"
                        ? "border-red-500/30 bg-red-500/10 text-red-400"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                  }`}
                >
                  {colaborador.PORTAL || "Pendente"}
                </Badge>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-muted/50 p-3 min-w-20 flex-1">
                <span className="text-xs text-muted-foreground">Crachá</span>
                <Badge
                  variant="outline"
                  className={`${
                    colaborador.CRACHA === "Emitido"
                      ? "border-[#337246]/30 bg-[#337246]/10 text-[#337246]"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                  }`}
                >
                  {colaborador.CRACHA || "Pendente"}
                </Badge>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-muted/50 p-3 min-w-20 flex-1">
                <span className="text-xs text-muted-foreground">Ponto</span>
                <Badge
                  variant="outline"
                  className={`${
                    colaborador.PONTO === "Cadastrado"
                      ? "border-[#337246]/30 bg-[#337246]/10 text-[#337246]"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                  }`}
                >
                  {colaborador.PONTO || "Pendente"}
                </Badge>
              </div>
            </div>
          </Section>

          {/* Mobilização */}
          <Section title="Mobilização" icon={Truck}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-muted-foreground">MOB</span>
                <div className="mt-1">
                  <Badge
                    variant="outline"
                    className={`${
                      colaborador.MOB?.trim()
                        ? "border-[#337246]/30 bg-[#337246]/10 text-[#337246]"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    {colaborador.MOB?.trim() || "Pendente"}
                  </Badge>
                </div>
              </div>
              <InfoField
                label="Pré-Admissão"
                value={colaborador.PRE_ADMISSAO || "-"}
              />
              <InfoField label="OP" value={colaborador.OP || "-"} />
              <InfoField label="REQ" value={colaborador.REQ || "-"} />
            </div>
          </Section>

          {/* Saúde Ocupacional */}
          <Section title="Saúde Ocupacional" icon={ShieldCheck}>
            <div className="flex flex-wrap gap-2">
              <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-muted/50 p-3 min-w-20 flex-1">
                <span className="text-xs text-muted-foreground">Exame</span>
                <Badge
                  variant="outline"
                  className={`${
                    colaborador.EXAME === "Realizado"
                      ? "border-[#337246]/30 bg-[#337246]/10 text-[#337246]"
                      : colaborador.EXAME === "Agendado"
                        ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                  }`}
                >
                  {colaborador.EXAME || "Pendente"}
                </Badge>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-muted/50 p-3 min-w-20 flex-1">
                <span className="text-xs text-muted-foreground">ASO</span>
                <Badge
                  variant="outline"
                  className={`${
                    colaborador.ASO === "Apto"
                      ? "border-[#337246]/30 bg-[#337246]/10 text-[#337246]"
                      : colaborador.ASO === "Inapto"
                        ? "border-red-500/30 bg-red-500/10 text-red-400"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                  }`}
                >
                  {colaborador.ASO || "Pendente"}
                </Badge>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-muted/50 p-3 min-w-20 flex-1">
                <span className="text-xs text-muted-foreground">Clínica</span>
                <span className="text-sm font-medium truncate max-w-25">
                  {colaborador.CLINICA || "-"}
                </span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-muted/50 p-3 min-w-20 flex-1">
                <span className="text-xs text-muted-foreground">RPV</span>
                <span className="text-sm font-medium truncate max-w-25">
                  {colaborador.RPV || "-"}
                </span>
              </div>
            </div>
          </Section>

          {/* Logística de treinamento (campos da planilha) */}
          <Section title="Treinamento — Logística" icon={Truck}>
            <div className="grid grid-cols-2 gap-3">
              <InfoField
                label="Realizar"
                value={colaborador.REALIZAR_TREINAMENTO || "-"}
              />
              <InfoField
                label="Local"
                value={colaborador.LOCAL_TREINAMENTO || "-"}
              />
            </div>
          </Section>
        </div>

        {/* Treinamentos normativos — vem de colaborador_treinamentos */}
        <div className="mt-6">
          <Section title="Treinamentos" icon={Calendar}>
            {carregandoTreinamentos || !aplicaveis ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : aplicaveis.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhum treinamento aplicável cadastrado para este colaborador.{" "}
                {colaborador.id && (
                  <Link
                    href={`/central/editar/${colaborador.id}`}
                    className="text-primary underline underline-offset-2"
                  >
                    Cadastrar na tela de edição
                  </Link>
                )}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[45%]">Curso / Treinamento</TableHead>
                      <TableHead>Realização</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aplicaveis.map((item) => {
                      const status = item.status ?? "Pendente";
                      const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["Pendente"];
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="text-sm font-medium">
                            {item.treinamento?.nome ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatarDataBR(item.data_realizacao)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatarDataBR(item.data_validade)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}
                            >
                              {cfg.icon}
                              {cfg.label}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </Section>
        </div>
    </>
  );
}
