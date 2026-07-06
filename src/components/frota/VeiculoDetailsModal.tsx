"use client";

import { useQuery } from "@tanstack/react-query";
import { Wrench, CreditCard, Tag as TagIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { frotaApi, type FrotaVeiculo } from "@/lib/axios";
import { formatDate, formatBRL, statusBadgeClass } from "@/components/frota/frota-utils";

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value || "—"}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 border-b pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground first:mt-0">
      {children}
    </p>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculo: FrotaVeiculo | null;
}

export function VeiculoDetailsModal({ open, onOpenChange, veiculo }: Props) {
  const { data: manutencoes, isLoading: loadingManut } = useQuery({
    queryKey: ["frota-manutencoes", "veiculo", veiculo?.id],
    queryFn: async () => {
      const res = await frotaApi.manutencoes.listar({ veiculo_id: veiculo!.id, limit: 10 });
      return res.data.data;
    },
    enabled: open && !!veiculo?.id,
  });

  const { data: cartoes } = useQuery({
    queryKey: ["frota-cartoes", "veiculo", veiculo?.id],
    queryFn: async () => {
      const res = await frotaApi.cartoes.listar({ veiculo_id: veiculo!.id, limit: 10 });
      return res.data.data.filter((c) => c.veiculo_id === veiculo!.id);
    },
    enabled: open && !!veiculo?.id,
  });

  const { data: tags } = useQuery({
    queryKey: ["frota-tags", "veiculo", veiculo?.id],
    queryFn: async () => {
      const res = await frotaApi.tags.listar({ veiculo_id: veiculo!.id, limit: 10 });
      return res.data.data.filter((t) => t.veiculo_id === veiculo!.id);
    },
    enabled: open && !!veiculo?.id,
  });

  if (!veiculo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="font-mono">{veiculo.placa}</DialogTitle>
            <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", statusBadgeClass(veiculo.status))}>
              {veiculo.status || "N/I"}
            </span>
          </div>
          <DialogDescription>
            {[veiculo.marca, veiculo.modelo, veiculo.tipo].filter(Boolean).join(" • ") || "Detalhes do veículo"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <SectionTitle>Identificação</SectionTitle>
          <div className="grid grid-cols-3 gap-3">
            <Info label="Marca" value={veiculo.marca} />
            <Info label="Modelo" value={veiculo.modelo} />
            <Info label="Tipo" value={veiculo.tipo} />
            <Info label="Ano fabricação" value={veiculo.ano_fabricacao} />
            <Info label="Combustível" value={veiculo.combustivel} />
            <Info label="Chave reserva" value={veiculo.chave_reserva} />
            <Info label="RENAVAM" value={veiculo.renavam} />
            <Info label="CRV" value={veiculo.crv} />
            <Info label="UF" value={veiculo.uf} />
          </div>

          <SectionTitle>Alocação</SectionTitle>
          <div className="grid grid-cols-3 gap-3">
            <Info label="Gestor" value={veiculo.gestor} />
            <Info label="Local de trabalho" value={veiculo.local_trabalho} />
            <Info label="Centro de custo" value={veiculo.centro_custo} />
            <Info label="UT atual" value={veiculo.ut_atual} />
            <Info label="Condutor" value={veiculo.condutor_nome} />
            <Info label="RE condutor" value={veiculo.condutor_re} />
          </div>

          <SectionTitle>Contrato</SectionTitle>
          <div className="grid grid-cols-3 gap-3">
            <Info label="Propriedade" value={veiculo.propriedade} />
            <Info label="Modalidade" value={veiculo.modalidade} />
            <Info label="Tipo contrato" value={veiculo.tipo_contrato} />
            <Info label="Valor locação" value={formatBRL(veiculo.valor_locacao)} />
            <Info label="CNPJ proprietário" value={veiculo.cnpj_proprietario} />
            <Info label="Rastreador" value={veiculo.rastreador} />
            <Info label="Telefone" value={veiculo.telefone} />
            <Info label="Aplicação/Devolução" value={veiculo.aplicacao_devolucao} />
            <Info label="Data aplicação" value={formatDate(veiculo.data_aplicacao)} />
          </div>

          {(cartoes?.length || tags?.length) ? (
            <>
              <SectionTitle>Cartões & Tags vinculados</SectionTitle>
              <div className="space-y-1.5">
                {cartoes?.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 text-sm">
                    <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-mono">{c.numero}</span>
                    <span className="text-xs text-muted-foreground">{c.status || ""}</span>
                    {c.saldo_atual != null && (
                      <span className="text-xs text-muted-foreground">Saldo: {formatBRL(c.saldo_atual)}</span>
                    )}
                  </div>
                ))}
                {tags?.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 text-sm">
                    <TagIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-mono">{t.numero}</span>
                    <span className="text-xs text-muted-foreground">{t.marca || ""} {t.status || ""}</span>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <SectionTitle>Últimas manutenções</SectionTitle>
          {loadingManut ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : !manutencoes?.length ? (
            <p className="text-sm text-muted-foreground">Nenhuma manutenção registrada.</p>
          ) : (
            <div className="space-y-2">
              {manutencoes.map((m) => (
                <div key={m.id} className="flex items-start gap-2 rounded-md border p-2">
                  <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{m.tipo}</span>
                      {m.data_atendimento && <span className="text-muted-foreground"> • {formatDate(m.data_atendimento)}</span>}
                      {m.km_atual != null && <span className="text-muted-foreground"> • {m.km_atual.toLocaleString("pt-BR")} km</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground" title={m.descricao_servico ?? undefined}>
                      {m.descricao_servico || "—"}
                      {m.local_oficina ? ` — ${m.local_oficina}` : ""}
                    </p>
                    {m.previsao_proxima && (
                      <p className="text-xs text-muted-foreground">
                        Próxima revisão: {formatDate(m.previsao_proxima)}
                        {m.km_proxima_revisao != null ? ` ou ${m.km_proxima_revisao.toLocaleString("pt-BR")} km` : ""}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {veiculo.observacoes && (
            <>
              <SectionTitle>Observações</SectionTitle>
              <p className="text-sm text-muted-foreground">{veiculo.observacoes}</p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
