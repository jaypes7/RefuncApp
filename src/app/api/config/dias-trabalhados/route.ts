/**
 * ============================================================================
 * API: /api/config/dias-trabalhados
 * ============================================================================
 * GET  → retorna os dias trabalhados do projeto
 * POST → atualiza os dias trabalhados do projeto
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth, resolveCentroCusto } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth();

    const { searchParams } = new URL(request.url);
    const ccParam = searchParams.get("centro_custo") || undefined;
    const centroCusto = resolveCentroCusto(currentUser, ccParam)?.[0] || "DEMO-001";

    const db = createServerClient();
    const { data, error } = await db
      .from("configuracoes")
      .select("dias_trabalhados, data_inicio_projeto, data_fim_projeto")
      .eq("centro_custo", centroCusto)
      .single();

    if (error) throw error;

    const diasTrabalhados = data?.dias_trabalhados || [];
    const dataInicio = data?.data_inicio_projeto;
    const dataFim = data?.data_fim_projeto;

    // Filtra apenas os dias dentro do intervalo do projeto
    const diasFiltrados = dataInicio && dataFim
      ? diasTrabalhados.filter((d: string) => d >= dataInicio && d <= dataFim)
      : diasTrabalhados;

    return NextResponse.json({ 
      dias_trabalhados: diasFiltrados 
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[GET /api/config/dias-trabalhados]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth();

    const body = await request.json();
    const { dias_trabalhados, centro_custo } = body;
    const targetCentroCusto = resolveCentroCusto(currentUser, centro_custo)?.[0] || "DEMO-001";

    if (!Array.isArray(dias_trabalhados)) {
      return NextResponse.json(
        { error: "dias_trabalhados deve ser um array" },
        { status: 400 }
      );
    }

    // Valida formato das datas (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const invalidDates = dias_trabalhados.filter((d) => !dateRegex.test(d));
    if (invalidDates.length > 0) {
      return NextResponse.json(
        { error: "Datas devem estar no formato YYYY-MM-DD", invalidDates },
        { status: 400 }
      );
    }

    const db = createServerClient();

    // Busca as datas do projeto para validar o intervalo
    const { data: configData, error: configError } = await db
      .from("configuracoes")
      .select("data_inicio_projeto, data_fim_projeto")
      .eq("centro_custo", targetCentroCusto)
      .single();

    if (configError) throw configError;

    const dataInicio = configData?.data_inicio_projeto;
    const dataFim = configData?.data_fim_projeto;

    if (dataInicio && dataFim) {
      const foraDoIntervalo = dias_trabalhados.filter(
        (d: string) => d < dataInicio || d > dataFim
      );
      if (foraDoIntervalo.length > 0) {
        return NextResponse.json(
          { error: "Existem dias fora do intervalo do projeto", foraDoIntervalo, dataInicio, dataFim },
          { status: 400 }
        );
      }
    }

    const { error } = await db
      .from("configuracoes")
      .update({ 
        dias_trabalhados: dias_trabalhados.sort(),
        updated_at: new Date().toISOString(),
      })
      .eq("centro_custo", targetCentroCusto);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[POST /api/config/dias-trabalhados]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
