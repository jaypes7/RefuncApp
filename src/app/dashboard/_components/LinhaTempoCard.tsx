"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, MessageSquare, Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CanAccess } from "@/components/CanAccess";
import { useFilter } from "@/contexts/FilterContext";
import {
  comentariosClienteApi,
  ocorrenciasApi,
  type ComentarioCliente,
  type Ocorrencia,
} from "@/lib/axios";

export function LinhaTempoCard() {
  const queryClient = useQueryClient();
  const { centroCusto, isReady: filterReady } = useFilter();

  // ── Ocorrências manuais ────────────────────────────────────────────────────
  const [novoTexto, setNovoTexto] = useState("");
  const [novaData, setNovaData] = useState("");

  // Estados para edição
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editandoTexto, setEditandoTexto] = useState("");
  const [editandoData, setEditandoData] = useState("");

  const { data: ocorrenciasData } = useQuery({
    queryKey: ["ocorrencias", centroCusto],
    queryFn: async () => (await ocorrenciasApi.listar(centroCusto)).data.data,
    staleTime: 30_000,
    enabled: filterReady,
  });
  const ocorrencias: Ocorrencia[] = ocorrenciasData ?? [];

  const criarOcorrencia = useMutation({
    mutationFn: () => ocorrenciasApi.criar({ texto: novoTexto.trim(), data: novaData, centro_custo: centroCusto || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ocorrencias", centroCusto], type: "all" });
      setNovoTexto("");
      setNovaData("");
    },
  });

  const deletarOcorrencia = useMutation({
    mutationFn: (id: number) => ocorrenciasApi.deletar(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ocorrencias", centroCusto], type: "all" }),
  });

  const atualizarOcorrencia = useMutation({
    mutationFn: ({ id, texto, data }: { id: number; texto: string; data: string }) =>
      ocorrenciasApi.atualizar(id, { texto: texto.trim(), data, centro_custo: centroCusto || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ocorrencias", centroCusto], type: "all" });
      setEditandoId(null);
      setEditandoTexto("");
      setEditandoData("");
    },
  });

  const iniciarEdicao = (o: Ocorrencia) => {
    setEditandoId(o.id);
    setEditandoTexto(o.texto);
    setEditandoData(o.data);
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setEditandoTexto("");
    setEditandoData("");
  };

  // ── Comentários do Cliente ─────────────────────────────────────────────────
  const [novoComentario, setNovoComentario] = useState("");
  const [novaDataComentario, setNovaDataComentario] = useState("");
  const [editandoComentarioId, setEditandoComentarioId] = useState<number | null>(null);
  const [editandoComentarioTexto, setEditandoComentarioTexto] = useState("");
  const [editandoComentarioData, setEditandoComentarioData] = useState("");

  const { data: comentariosData } = useQuery({
    queryKey: ["comentarios-cliente", centroCusto],
    queryFn: async () => (await comentariosClienteApi.listar(centroCusto)).data.data,
    staleTime: 30_000,
    enabled: filterReady,
  });
  const comentarios: ComentarioCliente[] = comentariosData ?? [];

  const criarComentario = useMutation({
    mutationFn: () => comentariosClienteApi.criar({ texto: novoComentario.trim(), data: novaDataComentario, centro_custo: centroCusto || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comentarios-cliente", centroCusto], type: "all" });
      setNovoComentario("");
      setNovaDataComentario("");
    },
  });

  const deletarComentario = useMutation({
    mutationFn: (id: number) => comentariosClienteApi.deletar(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comentarios-cliente", centroCusto], type: "all" }),
  });

  const atualizarComentario = useMutation({
    mutationFn: ({ id, texto, data }: { id: number; texto: string; data: string }) =>
      comentariosClienteApi.atualizar(id, { texto: texto.trim(), data, centro_custo: centroCusto || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comentarios-cliente", centroCusto], type: "all" });
      setEditandoComentarioId(null);
      setEditandoComentarioTexto("");
      setEditandoComentarioData("");
    },
  });

  const iniciarEdicaoComentario = (c: ComentarioCliente) => {
    setEditandoComentarioId(c.id);
    setEditandoComentarioTexto(c.texto);
    setEditandoComentarioData(c.data);
  };

  const cancelarEdicaoComentario = () => {
    setEditandoComentarioId(null);
    setEditandoComentarioTexto("");
    setEditandoComentarioData("");
  };

  return (
    <Card data-cardtv-id="geral-linha-tempo-contrato" className="glass-card lg:col-span-1 flex flex-col h-[460px] 2xl:h-[590px] overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Linha do tempo do Contrato
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden">
        {/* Seção Ocorrências */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Formulário — somente admin/user */}
          <CanAccess role="user">
            <div className="flex gap-2 mb-4 shrink-0">
              <Input
                className="glass-input flex-1 min-w-0"
                placeholder="Descreva a ocorrência..."
                value={novoTexto}
                onChange={(e) => setNovoTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    novoTexto.trim() &&
                    novaData &&
                    !criarOcorrencia.isPending
                  )
                    criarOcorrencia.mutate();
                }}
              />
              <Input
                className="glass-input w-36 shrink-0"
                type="date"
                value={novaData}
                onChange={(e) => setNovaData(e.target.value)}
              />
              <Button
                size="icon"
                variant="outline"
                disabled={!novoTexto.trim() || !novaData || criarOcorrencia.isPending}
                onClick={() => criarOcorrencia.mutate()}
                title="Adicionar ocorrência"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CanAccess>

          <div className="border-t border-white/10 mb-3 shrink-0" />

          {/* Lista */}
          {ocorrencias.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
              <AlertTriangle className="h-8 w-8 opacity-20" />
              <p className="text-sm">Nenhuma ocorrência registrada</p>
            </div>
          ) : (
            <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto pr-1">
              {ocorrencias.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2"
                >
                  {editandoId === o.id ? (
                    // Modo de edição
                    <>
                      <div className="min-w-0 flex-1 space-y-2">
                        <Input
                          className="glass-input h-8 text-sm"
                          value={editandoTexto}
                          onChange={(e) => setEditandoTexto(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && editandoTexto.trim() && editandoData) {
                              atualizarOcorrencia.mutate({
                                id: o.id,
                                texto: editandoTexto,
                                data: editandoData,
                              });
                            }
                          }}
                          placeholder="Descrição da ocorrência..."
                        />
                        <Input
                          className="glass-input h-8 text-sm w-36"
                          type="date"
                          value={editandoData}
                          onChange={(e) => setEditandoData(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          disabled={!editandoTexto.trim() || !editandoData || atualizarOcorrencia.isPending}
                          onClick={() =>
                            atualizarOcorrencia.mutate({
                              id: o.id,
                              texto: editandoTexto,
                              data: editandoData,
                            })
                          }
                          title="Salvar alterações"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-muted-foreground"
                          onClick={cancelarEdicao}
                          title="Cancelar edição"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    // Modo de visualização
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate" title={o.texto}>
                          {o.texto}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">
                            {new Date(o.data + "T00:00:00Z").toLocaleDateString("pt-BR", {
                              timeZone: "UTC",
                            })}
                          </p>
                          {!centroCusto && o.centro_custo && (
                            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-primary/20 text-primary">
                              {o.centro_custo}
                            </span>
                          )}
                        </div>
                      </div>
                      <CanAccess role="user">
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => iniciarEdicao(o)}
                            title="Editar ocorrência"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            disabled={deletarOcorrencia.isPending}
                            onClick={() => deletarOcorrencia.mutate(o.id)}
                            title="Remover ocorrência"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CanAccess>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Comentários do Cliente ── */}
        <div className="border-t border-white/10 my-4 shrink-0" />

        {/* Seção Comentários do Cliente */}
        <div className="shrink-0 max-h-[45%] flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 mb-3 shrink-0">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Comentários do Cliente</span>
          </div>

          {/* Formulário — todos os perfis autenticados */}
          <div className="flex gap-2 mb-4 shrink-0">
            <Input
              className="glass-input flex-1 min-w-0"
              placeholder="Adicionar comentário do cliente..."
              value={novoComentario}
              onChange={(e) => setNovoComentario(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  novoComentario.trim() &&
                  novaDataComentario &&
                  !criarComentario.isPending
                )
                  criarComentario.mutate();
              }}
            />
            <Input
              className="glass-input w-36 shrink-0"
              type="date"
              value={novaDataComentario}
              onChange={(e) => setNovaDataComentario(e.target.value)}
            />
            <Button
              size="icon"
              variant="outline"
              disabled={!novoComentario.trim() || !novaDataComentario || criarComentario.isPending}
              onClick={() => criarComentario.mutate()}
              title="Adicionar comentário"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Lista de comentários */}
          {comentarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-6 text-center text-muted-foreground">
              <MessageSquare className="h-6 w-6 opacity-20" />
              <p className="text-sm">Nenhum comentário registrado</p>
            </div>
          ) : (
            <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto pr-1">
              {comentarios.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2"
                >
                  {editandoComentarioId === c.id ? (
                    <>
                      <div className="min-w-0 flex-1 space-y-2">
                        <Input
                          className="glass-input h-8 text-sm"
                          value={editandoComentarioTexto}
                          onChange={(e) => setEditandoComentarioTexto(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && editandoComentarioTexto.trim() && editandoComentarioData) {
                              atualizarComentario.mutate({
                                id: c.id,
                                texto: editandoComentarioTexto,
                                data: editandoComentarioData,
                              });
                            }
                          }}
                          placeholder="Comentário..."
                        />
                        <Input
                          className="glass-input h-8 text-sm w-36"
                          type="date"
                          value={editandoComentarioData}
                          onChange={(e) => setEditandoComentarioData(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          disabled={!editandoComentarioTexto.trim() || !editandoComentarioData || atualizarComentario.isPending}
                          onClick={() =>
                            atualizarComentario.mutate({
                              id: c.id,
                              texto: editandoComentarioTexto,
                              data: editandoComentarioData,
                            })
                          }
                          title="Salvar"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground"
                          onClick={cancelarEdicaoComentario}
                          title="Cancelar"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate" title={c.texto}>
                          {c.texto}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">
                            {new Date(c.data + "T00:00:00Z").toLocaleDateString("pt-BR", {
                              timeZone: "UTC",
                            })}
                          </p>
                          {!centroCusto && c.centro_custo && (
                            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-primary/20 text-primary">
                              {c.centro_custo}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => iniciarEdicaoComentario(c)}
                          title="Editar comentário"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          disabled={deletarComentario.isPending}
                          onClick={() => deletarComentario.mutate(c.id)}
                          title="Remover comentário"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
