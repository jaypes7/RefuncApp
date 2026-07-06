/**
 * ============================================================================
 * CONTROLE DE FROTA — Fábrica de handlers CRUD
 * ============================================================================
 *
 * As 6 entidades de frota (veículos, manutenções, prestadores, fornecedores,
 * cartões e tags) compartilham o mesmo contrato de API:
 *   GET    /api/frota/<entidade>        → lista paginada com search/filtros
 *   POST   /api/frota/<entidade>        → cria registro
 *   PUT    /api/frota/<entidade>/[id]   → atualiza registro
 *   DELETE /api/frota/<entidade>/[id]   → remove registro
 *
 * Todas exigem perfil admin (requireAuth("admin")).
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

function handleError(error: unknown, context: string) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Dados inválidos", details: error.issues },
      { status: 400 },
    );
  }
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (error instanceof Error && error.message === "FORBIDDEN") {
    return NextResponse.json(
      { error: "Acesso negado: privilégios insuficientes" },
      { status: 403 },
    );
  }
  console.error(`[${context}]`, error);
  return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
}

export interface CrudConfig {
  table: string;
  /** Colunas usadas na busca textual (.ilike com OR) */
  searchCols?: string[];
  /** Colunas que aceitam filtro exato via query param homônimo (CSV → .in) */
  filterCols?: string[];
  orderBy?: { column: string; ascending?: boolean };
  createSchema: ZodType;
  updateSchema: ZodType;
}

export function makeListHandler(cfg: CrudConfig) {
  return async function GET(request: NextRequest) {
    try {
      await requireAuth("admin");

      const { searchParams } = new URL(request.url);
      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
      const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
      const search = searchParams.get("search")?.trim();

      const supabase = createServerClient();
      let query = supabase.from(cfg.table).select("*", { count: "exact" });

      if (search && cfg.searchCols?.length) {
        query = query.or(cfg.searchCols.map((c) => `${c}.ilike.%${search}%`).join(","));
      }

      for (const col of cfg.filterCols ?? []) {
        const raw = searchParams.get(col);
        if (raw) {
          const values = raw.split(",").filter(Boolean);
          if (values.length) query = query.in(col, values);
        }
      }

      const order = cfg.orderBy ?? { column: "created_at", ascending: false };
      query = query.order(order.column, { ascending: order.ascending ?? true });

      const from = (page - 1) * limit;
      query = query.range(from, from + limit - 1);

      const { data, count, error } = await query;
      if (error) throw new Error(`Erro ao listar ${cfg.table}: ${error.message}`);

      const total = count ?? 0;
      return NextResponse.json({
        data: data ?? [],
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      return handleError(error, `GET /frota/${cfg.table}`);
    }
  };
}

export function makeCreateHandler(cfg: CrudConfig) {
  return async function POST(request: NextRequest) {
    try {
      await requireAuth("admin");

      const body = await request.json();
      const validated = cfg.createSchema.parse(body);
      const supabase = createServerClient();

      const { data, error } = await supabase
        .from(cfg.table)
        .insert(validated)
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          return NextResponse.json({ error: "Registro duplicado (valor único já cadastrado)" }, { status: 409 });
        }
        throw new Error(`Erro ao criar em ${cfg.table}: ${error.message}`);
      }

      return NextResponse.json({ data }, { status: 201 });
    } catch (error) {
      return handleError(error, `POST /frota/${cfg.table}`);
    }
  };
}

export function makeUpdateHandler(cfg: CrudConfig) {
  return async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) {
    try {
      await requireAuth("admin");

      const { id } = await params;
      const body = await request.json();
      const validated = cfg.updateSchema.parse(body);
      const supabase = createServerClient();

      const { data, error } = await supabase
        .from(cfg.table)
        .update({ ...(validated as Record<string, unknown>), updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 });
        }
        if (error.code === "23505") {
          return NextResponse.json({ error: "Registro duplicado (valor único já cadastrado)" }, { status: 409 });
        }
        throw new Error(`Erro ao atualizar ${cfg.table}: ${error.message}`);
      }

      return NextResponse.json({ data });
    } catch (error) {
      return handleError(error, `PUT /frota/${cfg.table}/:id`);
    }
  };
}

export function makeDeleteHandler(cfg: CrudConfig) {
  return async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) {
    try {
      await requireAuth("admin");

      const { id } = await params;
      const supabase = createServerClient();

      const { error } = await supabase.from(cfg.table).delete().eq("id", id);
      if (error) throw new Error(`Erro ao remover de ${cfg.table}: ${error.message}`);

      return NextResponse.json({ success: true });
    } catch (error) {
      return handleError(error, `DELETE /frota/${cfg.table}/:id`);
    }
  };
}
