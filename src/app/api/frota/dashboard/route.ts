/**
 * GET /api/frota/dashboard → agregados para a aba "Visão Geral" da frota.
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

function countBy(rows: Record<string, unknown>[], key: string) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const value = (row[key] as string | null) || "N/I";
    map.set(value, (map.get(value) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total);
}

export async function GET() {
  try {
    await requireAuth("admin");

    const supabase = createServerClient();

    const [veiculosRes, cartoesRes, tagsRes, revisoesRes] = await Promise.all([
      supabase.from("frota_veiculos").select("id, placa, modelo, status, tipo, propriedade"),
      supabase.from("frota_cartoes").select("id, tipo, status"),
      supabase.from("frota_tags").select("id, status, veiculo_id"),
      // Próximas revisões previstas (só veículos com previsão registrada)
      supabase
        .from("frota_manutencoes")
        .select("placa, previsao_proxima, km_proxima_revisao, descricao_servico")
        .not("previsao_proxima", "is", null)
        .order("previsao_proxima", { ascending: false }),
    ]);

    for (const res of [veiculosRes, cartoesRes, tagsRes, revisoesRes]) {
      if (res.error) throw new Error(res.error.message);
    }

    const veiculos = veiculosRes.data ?? [];
    const cartoes = cartoesRes.data ?? [];
    const tags = tagsRes.data ?? [];
    const revisoes = revisoesRes.data ?? [];

    const ativos = veiculos.filter((v) => v.status === "ATIVO");
    const placasAtivas = new Set(ativos.map((v) => v.placa));

    // Última previsão de revisão por placa (apenas veículos ativos)
    const ultimaRevisao = new Map<string, { previsao_proxima: string; km_proxima_revisao: number | null; descricao_servico: string | null }>();
    for (const r of revisoes) {
      if (r.placa && placasAtivas.has(r.placa) && !ultimaRevisao.has(r.placa)) {
        ultimaRevisao.set(r.placa, r);
      }
    }

    const hoje = new Date();
    const em30dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);
    const revisoesProximas = Array.from(ultimaRevisao.entries())
      .map(([placa, r]) => ({
        placa,
        previsao: r.previsao_proxima,
        km_proxima_revisao: r.km_proxima_revisao,
        descricao: r.descricao_servico,
        vencida: new Date(r.previsao_proxima) < hoje,
      }))
      .filter((r) => new Date(r.previsao) <= em30dias)
      .sort((a, b) => a.previsao.localeCompare(b.previsao));

    return NextResponse.json({
      veiculos: {
        total: veiculos.length,
        porStatus: countBy(veiculos, "status"),
        porTipo: countBy(ativos, "tipo"),
        porPropriedade: countBy(ativos, "propriedade"),
      },
      cartoes: {
        total: cartoes.length,
        estoque: cartoes.filter((c) => c.tipo === "ESTOQUE").length,
        ativos: cartoes.filter((c) => c.status === "ATIVO").length,
      },
      tags: {
        total: tags.length,
        vinculadas: tags.filter((t) => t.veiculo_id).length,
      },
      revisoesProximas,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[GET /frota/dashboard]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
