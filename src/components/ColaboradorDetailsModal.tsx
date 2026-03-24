"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { type Colaborador } from "@/lib/axios";
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

// Helper para formatar CPF
function formatCPF(cpf: string | number | null | undefined): string {
  if (!cpf) return "-";
  const clean = String(cpf).replace(/\D/g, "");
  if (clean.length !== 11) return String(cpf);
  return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

// Helper para determinar status geral
function calcularStatusGeral(colab: Colaborador) {
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
  if (colab.MOB === "Sim") {
    ok.push("MOB Concluído");
  } else if (colab.MOB === "Em Trânsito") {
    alertas.push("Em Deslocamento");
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

  // Verificar Treinamento
  if (colab.TREINAMENTO === "Concluído") {
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
    <div className="flex flex-col gap-3 bg-slate-800/50 p-4 rounded-lg">
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
  if (!colaborador) return null;

  const statusGeral = calcularStatusGeral(colaborador);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-225 w-[95vw] max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-lg truncate">{colaborador.NOME}</p>
              <p className="text-sm font-normal text-muted-foreground truncate">
                {formatCPF(colaborador.CPF)} •{" "}
                {colaborador.FUNCAO_CLT || "Sem função"}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* STATUS GERAL */}
        <div className="mt-4 rounded-lg border border-white/10 bg-linear-to-r from-primary/5 to-transparent p-4">
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
                <span className="text-xs font-medium text-emerald-400 shrink-0">
                  Concluído:
                </span>
                {statusGeral.ok.slice(0, 3).map((o, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  >
                    <CheckCircle className="h-3 w-3" />
                    {o}
                  </Badge>
                ))}
                {statusGeral.ok.length > 3 && (
                  <Badge
                    variant="outline"
                    className="border-emerald-500/30 text-emerald-400"
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
              <InfoField label="CPF" value={formatCPF(colaborador.CPF)} />
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
              <InfoField label="Telefone" value={colaborador.TELEFONE || "-"} />
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
              <div className="flex flex-col items-center gap-1 rounded-lg border border-white/5 bg-white/5 p-3 min-w-20 flex-1">
                <span className="text-xs text-muted-foreground">Portal</span>
                <Badge
                  variant="outline"
                  className={`${
                    colaborador.PORTAL === "Liberado"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : colaborador.PORTAL === "Bloqueado"
                        ? "border-red-500/30 bg-red-500/10 text-red-400"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                  }`}
                >
                  {colaborador.PORTAL || "Pendente"}
                </Badge>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-lg border border-white/5 bg-white/5 p-3 min-w-20 flex-1">
                <span className="text-xs text-muted-foreground">Crachá</span>
                <Badge
                  variant="outline"
                  className={`${
                    colaborador.CRACHA === "Emitido"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                  }`}
                >
                  {colaborador.CRACHA || "Pendente"}
                </Badge>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-lg border border-white/5 bg-white/5 p-3 min-w-20 flex-1">
                <span className="text-xs text-muted-foreground">Ponto</span>
                <Badge
                  variant="outline"
                  className={`${
                    colaborador.PONTO === "Cadastrado"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
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
                      colaborador.MOB === "Sim"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    {colaborador.MOB || "Pendente"}
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
              <div className="flex flex-col items-center gap-1 rounded-lg border border-white/5 bg-white/5 p-3 min-w-20 flex-1">
                <span className="text-xs text-muted-foreground">Exame</span>
                <Badge
                  variant="outline"
                  className={`${
                    colaborador.EXAME === "Realizado"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : colaborador.EXAME === "Agendado"
                        ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                  }`}
                >
                  {colaborador.EXAME || "Pendente"}
                </Badge>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-lg border border-white/5 bg-white/5 p-3 min-w-20 flex-1">
                <span className="text-xs text-muted-foreground">ASO</span>
                <Badge
                  variant="outline"
                  className={`${
                    colaborador.ASO === "Apto"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : colaborador.ASO === "Inapto"
                        ? "border-red-500/30 bg-red-500/10 text-red-400"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                  }`}
                >
                  {colaborador.ASO || "Pendente"}
                </Badge>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-lg border border-white/5 bg-white/5 p-3 min-w-20 flex-1">
                <span className="text-xs text-muted-foreground">Clínica</span>
                <span className="text-sm font-medium truncate max-w-25">
                  {colaborador.CLINICA || "-"}
                </span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-lg border border-white/5 bg-white/5 p-3 min-w-20 flex-1">
                <span className="text-xs text-muted-foreground">RPV</span>
                <span className="text-sm font-medium truncate max-w-25">
                  {colaborador.RPV || "-"}
                </span>
              </div>
            </div>
          </Section>

          {/* Treinamentos */}
          <Section title="Treinamentos" icon={Calendar}>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <span className="text-xs text-muted-foreground">Status</span>
                <div className="mt-1">
                  <Badge
                    variant="outline"
                    className={`${
                      colaborador.TREINAMENTO === "Concluído"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : colaborador.TREINAMENTO === "Em Andamento"
                          ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    {colaborador.TREINAMENTO || "Pendente"}
                  </Badge>
                </div>
              </div>
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
      </DialogContent>
    </Dialog>
  );
}
