"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bed, Check, Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFilter } from "@/contexts/FilterContext";

type ConfigHotel = { id?: string; nome: string; qt_vagas: number; vagas_ocupadas: number; vagas_disponiveis: number };

export function HoteisTab() {
  const queryClient = useQueryClient();
  const { isReady: filterReady } = useFilter();

  // Hotéis - inputs para adicionar novo
  const [hotelNome, setHotelNome] = useState("");
  const [hotelVagas, setHotelVagas] = useState("");

  // Hotéis - edição inline de qt_vagas
  const [editingHotelId, setEditingHotelId] = useState<string | null>(null);
  const [editingQtVagas, setEditingQtVagas] = useState("");

  const { data: hoteisData } = useQuery<ConfigHotel[]>({
    queryKey: ["config", "hoteis"],
    queryFn: async () => {
      const res = await fetch("/api/config/hoteis");
      if (!res.ok) throw new Error("Falha ao carregar hotéis");
      return res.json();
    },
    enabled: filterReady,
  });

  const hoteis = hoteisData ?? [];

  const hotelMutation = useMutation({
    mutationFn: async (payload: { nome: string; qt_vagas: number }) => {
      const res = await fetch("/api/config/hoteis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Falha ao salvar hotel");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "hoteis"], type: "all" });
      setHotelNome("");
      setHotelVagas("");
      toast.success("Hotel salvo com sucesso!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteHotelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/config/hoteis?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Falha ao excluir hotel");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "hoteis"], type: "all" });
      toast.success("Hotel excluído com sucesso!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateHotelMutation = useMutation({
    mutationFn: async (payload: { id: string; qt_vagas: number }) => {
      const res = await fetch("/api/config/hoteis", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: payload.id, qt_vagas: Number(payload.qt_vagas) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Falha ao atualizar hotel");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "hoteis"], type: "all" });
      setEditingHotelId(null);
      toast.success("Hotel atualizado com sucesso!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <>
      <div>
        <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
          <Bed className="w-5 h-5 text-primary" />
          Gestão de Hotéis
        </h2>
        <p className="text-sm text-muted-foreground">
          Cadastre e gerencie os hotéis parceiros
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Lado Esquerdo - Formulário */}
        <div className="space-y-6">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider border-b pb-2">
            Novo Hotel
          </h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Nome do Hotel
              </label>
              <Input
                value={hotelNome}
                onChange={(e) => setHotelNome(e.target.value)}
                className="glass-input"
                placeholder="Nome do hotel"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Quantidade de Vagas
              </label>
              <Input
                type="number"
                min={0}
                value={hotelVagas}
                onChange={(e) => setHotelVagas(e.target.value)}
                className="glass-input"
                placeholder="0"
              />
            </div>
          </div>

          <Button
            onClick={() =>
              hotelMutation.mutate({
                nome: hotelNome,
                qt_vagas: Number(hotelVagas) || 0,
              })
            }
            disabled={!hotelNome?.trim() || hotelMutation.isPending}
            className="gap-2 w-full"
          >
            <Plus className="w-4 h-4" />
            Adicionar Hotel
          </Button>
        </div>

        {/* Lado Direito - Lista */}
        <div className="space-y-6">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider border-b pb-2">
            Hotéis Cadastrados
          </h3>

          <div className="space-y-2 max-h-100 overflow-y-auto">
            {hoteis.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bed className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum hotel cadastrado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {hoteis.map((hotel) => (
                  <div
                    key={hotel.id}
                    className="flex items-center justify-between p-3 bg-card/50 rounded-lg border border-border/50"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bed className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium block truncate">
                          {hotel.nome}
                        </span>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {/* Total de Vagas — inline edit or static */}
                          {editingHotelId === hotel.id ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground">Total:</span>
                              <Input
                                type="number"
                                min={0}
                                value={editingQtVagas}
                                onChange={(e) => setEditingQtVagas(e.target.value)}
                                className="h-6 w-20 px-1.5 text-xs glass-input"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && hotel.id)
                                    updateHotelMutation.mutate({ id: hotel.id, qt_vagas: Number(editingQtVagas) || 0 });
                                  if (e.key === "Escape") setEditingHotelId(null);
                                }}
                              />
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Total: <span className="font-medium text-foreground">{hotel.qt_vagas}</span>
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Ocupadas: <span className="font-medium text-amber-400">{hotel.vagas_ocupadas}</span>
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Disponíveis: <span className="font-medium text-[#337246]">{hotel.vagas_disponiveis}</span>
                          </span>
                        </div>
                        {hotel.qt_vagas > 0 && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden max-w-[120px]">
                              <div
                                className="h-full rounded-full bg-amber-400"
                                style={{
                                  width: `${Math.min(100, Math.round((hotel.vagas_ocupadas / hotel.qt_vagas) * 100))}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {Math.round((hotel.vagas_ocupadas / hotel.qt_vagas) * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {editingHotelId === hotel.id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              hotel.id &&
                              updateHotelMutation.mutate({ id: hotel.id, qt_vagas: Number(editingQtVagas) || 0 })
                            }
                            disabled={updateHotelMutation.isPending}
                            className="text-[#337246] hover:text-[#337246] hover:bg-[#337246]/10 h-7 w-7 p-0"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingHotelId(null)}
                            disabled={updateHotelMutation.isPending}
                            className="h-7 w-7 p-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingHotelId(hotel.id ?? null);
                              setEditingQtVagas(String(hotel.qt_vagas));
                            }}
                            disabled={deleteHotelMutation.isPending}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              hotel.id &&
                              deleteHotelMutation.mutate(hotel.id)
                            }
                            disabled={deleteHotelMutation.isPending}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
