import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { logAdicionar } from "@/lib/logs";

const RealocarSchema = z.object({
  id: z.string().uuid(),
  novo_centro_custo: z.string().min(1, "Centro de custo é obrigatório"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth("admin");

    const body = await request.json();
    const validated = RealocarSchema.parse(body);

    const supabase = createServerClient();

    const { data: talento, error: fetchError } = await supabase
      .from("banco_talentos")
      .select("*")
      .eq("id", validated.id)
      .single();

    if (fetchError || !talento) {
      return NextResponse.json({ error: "Talento não encontrado" }, { status: 404 });
    }

    if (talento.cpf) {
      const { data: duplicata } = await supabase
        .from("colaboradores")
        .select("cpf, nome, centro_custo")
        .eq("cpf", talento.cpf)
        .eq("centro_custo", validated.novo_centro_custo)
        .maybeSingle();

      if (duplicata) {
        return NextResponse.json(
          { error: "Este CPF já possui registro no centro de custo informado." },
          { status: 409 },
        );
      }
    }

    const novoRegistro = {
      cpf: talento.cpf,
      nome: talento.nome,
      pessoa: talento.pessoa,
      municipio: talento.municipio,
      uf: talento.uf,
      telefone: talento.telefone,
      idade: talento.idade,
      dt_nascimento: talento.dt_nasc,
      centro_custo: validated.novo_centro_custo,
      status: "Ativo",
    };

    const { data: inserido, error: insertError } = await supabase
      .from("colaboradores")
      .insert(novoRegistro)
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);

    await logAdicionar(
      user.re,
      String(talento.cpf ?? talento.id),
      `Banco de Talentos → Realocação: ${talento.nome} → ${validated.novo_centro_custo}`,
    );

    return NextResponse.json({ data: inserido }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json({ error: "Dados inválidos", details: error.issues }, { status: 400 });
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    if (error instanceof Error && error.message === "FORBIDDEN")
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    console.error("[POST /banco-talentos/realocar]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
