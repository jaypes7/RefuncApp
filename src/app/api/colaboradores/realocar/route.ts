/**
 * ============================================================================
 * API: /api/colaboradores/realocar
 * ============================================================================
 *
 * POST → Duplica um colaborador em outro centro de custo.
 *
 * Mantém: nome, cpf, pessoa, numero_oracle, municipio, uf, telefone.
 * O novo registro terá o centro_custo informado no body.
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { logAdicionar } from "@/lib/logs";

const RealocarSchema = z.object({
  id: z.string().uuid(),
  novo_centro_custo: z.string().min(1, "Centro de custo é obrigatório"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth("user");
    const body = await request.json();
    const validated = RealocarSchema.parse(body);

    const supabase = createServerClient();

    // 1. Busca o colaborador origem
    const { data: origem, error: origemError } = await supabase
      .from("colaboradores")
      .select("*")
      .eq("id", validated.id)
      .single();

    if (origemError || !origem) {
      return NextResponse.json(
        { error: "Colaborador não encontrado" },
        { status: 404 },
      );
    }

    // 2. Verifica se já existe o mesmo CPF no centro de custo destino
    const duplicataQuery = supabase
      .from("colaboradores")
      .select("cpf, nome, centro_custo")
      .eq("cpf", origem.cpf)
      .eq("centro_custo", validated.novo_centro_custo);

    const { data: duplicata } = await duplicataQuery.maybeSingle();

    if (duplicata) {
      return NextResponse.json(
        { error: "Este CPF já possui registro no centro de custo informado." },
        { status: 409 },
      );
    }

    // 3. Monta o novo registro mantendo apenas os campos solicitados
    const novoRegistro = {
      cpf: origem.cpf,
      nome: origem.nome,
      pessoa: origem.pessoa,
      numero_oracle: origem.numero_oracle,
      municipio: origem.municipio,
      uf: origem.uf,
      telefone: origem.telefone,
      centro_custo: validated.novo_centro_custo,
      status: "Ativo",
    };

    const { data: inserido, error: insertError } = await supabase
      .from("colaboradores")
      .insert(novoRegistro)
      .select()
      .single();

    if (insertError) {
      throw new Error(`Erro ao realocar colaborador: ${insertError.message}`);
    }

    // 4. Inativa o registro no centro de custo antigo
    const { error: updateError } = await supabase
      .from("colaboradores")
      .update({ status: "Desligado" })
      .eq("id", origem.id);

    if (updateError) {
      throw new Error(`Erro ao inativar colaborador no centro de custo antigo: ${updateError.message}`);
    }

    await logAdicionar(
      user.re,
      String(origem.cpf),
      `Realocação: ${origem.nome} → ${validated.novo_centro_custo}`,
    );

    return NextResponse.json({ data: inserido }, { status: 201 });
  } catch (error) {
    console.error("[POST /colaboradores/realocar]", error);

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
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
