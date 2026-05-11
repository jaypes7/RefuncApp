/**
 * ============================================================================
 * API: GET /api/testar-modelo
 * ============================================================================
 *
 * Endpoint temporário para validar o novo modelo relacional.
 * Cria um colaborador de teste, testa CRUD de filhos e remove tudo.
 *
 * Acesse: http://localhost:3000/api/testar-modelo
 * Depois dos testes, remova este arquivo.
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

interface TestResult {
  passo: string;
  status: "ok" | "erro";
  detalhes?: string;
}

export const dynamic = "force-dynamic";

export async function GET() {
  const resultados: TestResult[] = [];

  try {
    await requireAuth("user");
    const db = createServerClient();
    const cpfTeste = "99999999999";

    // ── Limpa teste anterior se existir ─────────────────────────────────────
    await db.from("colaboradores").delete().eq("cpf", cpfTeste);

    // ═══════════════════════════════════════════════════════════════════════
    // TESTE 1: Criar colaborador + trigger de filhos
    // ═══════════════════════════════════════════════════════════════════════
    const { data: colab, error: colabErr } = await db
      .from("colaboradores")
      .insert({ cpf: cpfTeste, nome: "COLABORADOR TESTE API", centro_custo: "TESTE-CC", status: "Ativo" })
      .select()
      .single();

    if (colabErr || !colab) {
      resultados.push({ passo: "Criar colaborador", status: "erro", detalhes: colabErr?.message });
      return NextResponse.json({ resultados, sucesso: false });
    }
    resultados.push({ passo: "Criar colaborador", status: "ok", detalhes: `ID: ${colab.id}` });

    // Verifica alimentação
    const { data: alim } = await db.from("colaborador_alimentacao").select("*").eq("colaborador_id", colab.id).single();
    if (alim) {
      resultados.push({ passo: "Trigger criou alimentação", status: "ok" });
    } else {
      resultados.push({ passo: "Trigger criou alimentação", status: "erro", detalhes: "Não encontrada" });
    }

    // Verifica treinamentos
    const { data: treinos, error: treinosErr } = await db
      .from("colaborador_treinamentos")
      .select("*")
      .eq("colaborador_id", colab.id);
    if (treinosErr) {
      resultados.push({ passo: "Trigger criou treinamentos", status: "erro", detalhes: treinosErr.message });
    } else if ((treinos?.length ?? 0) === 30) {
      resultados.push({ passo: "Trigger criou treinamentos", status: "ok", detalhes: "30 registros" });
    } else {
      resultados.push({ passo: "Trigger criou treinamentos", status: "erro", detalhes: `Encontrado: ${treinos?.length ?? 0}` });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TESTE 2: Passagem com trechos
    // ═══════════════════════════════════════════════════════════════════════
    const { data: passagem } = await db
      .from("colaborador_passagens")
      .insert({ colaborador_id: colab.id, motivo: "Mobilização", tipo_passagem: "Aéreo", observacoes: "Teste API" })
      .select()
      .single();

    if (passagem) {
      await db.from("passagem_trechos").insert([
        { passagem_id: passagem.id, ordem: 1, cidade_embarque: "São Paulo", data_embarque: "2026-06-01", cidade_desembarque: "Brasília", data_desembarque: "2026-06-01", valor_com_taxas: 450 },
        { passagem_id: passagem.id, ordem: 2, cidade_embarque: "Brasília", data_embarque: "2026-06-01", cidade_desembarque: "Belém", data_desembarque: "2026-06-01", valor_com_taxas: 320.5 },
      ]);

      const { data: trechos } = await db.from("passagem_trechos").select("*").eq("passagem_id", passagem.id);
      resultados.push({ passo: "Passagem com trechos", status: "ok", detalhes: `${trechos?.length ?? 0} trechos` });
    } else {
      resultados.push({ passo: "Passagem com trechos", status: "erro", detalhes: "Falha ao criar passagem" });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TESTE 3: Hospedagem
    // ═══════════════════════════════════════════════════════════════════════
    const { data: hosp } = await db
      .from("colaborador_hospedagens")
      .insert({ colaborador_id: colab.id, hotel_nome: "Hotel Teste API", tipo_apto: "Duplo", valor_diaria: 180, data_checkin: "2026-06-01" })
      .select()
      .single();

    if (hosp) {
      resultados.push({ passo: "Hospedagem", status: "ok", detalhes: `ID: ${hosp.id}` });
    } else {
      resultados.push({ passo: "Hospedagem", status: "erro", detalhes: "Falha ao criar" });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TESTE 4: Alimentação (update)
    // ═══════════════════════════════════════════════════════════════════════
    const { data: alimUpd } = await db
      .from("colaborador_alimentacao")
      .update({ credito_vr_almoco: true, credito_vr_janta: true })
      .eq("colaborador_id", colab.id)
      .select()
      .single();

    if (alimUpd?.credito_vr_almoco && alimUpd?.credito_vr_janta) {
      resultados.push({ passo: "Alimentação update", status: "ok", detalhes: "VR almoço e janta = true" });
    } else {
      resultados.push({ passo: "Alimentação update", status: "erro", detalhes: "Valores não atualizados" });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TESTE 5: Trigger de status de treinamentos
    // ═══════════════════════════════════════════════════════════════════════
    const { data: primeiroTreino } = await db.from("treinamentos").select("id").limit(1).single();
    if (primeiroTreino) {
      // Data futura → OK
      await db.from("colaborador_treinamentos").update({ data_validade: "2028-01-01" }).eq("colaborador_id", colab.id).eq("treinamento_id", primeiroTreino.id);
      const { data: t1 } = await db.from("colaborador_treinamentos").select("status").eq("colaborador_id", colab.id).eq("treinamento_id", primeiroTreino.id).single();
      resultados.push({ passo: "Status treinamento (OK)", status: t1?.status === "OK" ? "ok" : "erro", detalhes: t1?.status });

      // Data passada → Vencido
      const { data: todosTreinos } = await db.from("treinamentos").select("id").range(1, 1).single();
      if (todosTreinos) {
        await db.from("colaborador_treinamentos").update({ data_validade: "2020-01-01" }).eq("colaborador_id", colab.id).eq("treinamento_id", todosTreinos.id);
        const { data: t2 } = await db.from("colaborador_treinamentos").select("status").eq("colaborador_id", colab.id).eq("treinamento_id", todosTreinos.id).single();
        resultados.push({ passo: "Status treinamento (Vencido)", status: t2?.status === "Vencido" ? "ok" : "erro", detalhes: t2?.status });
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TESTE 6: View de compatibilidade
    // ═══════════════════════════════════════════════════════════════════════
    const { data: viewRow } = await db.from("v_colaboradores_completo").select("*").eq("id", colab.id).single();
    if (viewRow) {
      resultados.push({ passo: "View v_colaboradores_completo", status: "ok", detalhes: "Retornou dados agregados" });
    } else {
      resultados.push({ passo: "View v_colaboradores_completo", status: "erro", detalhes: "Não retornou dados" });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LIMPEZA
    // ═══════════════════════════════════════════════════════════════════════
    await db.from("colaboradores").delete().eq("id", colab.id);
    resultados.push({ passo: "Limpeza de dados de teste", status: "ok" });

    const todosOk = resultados.every((r) => r.status === "ok");
    return NextResponse.json({
      resultados,
      sucesso: todosOk,
      mensagem: todosOk
        ? "✅ Todos os testes passaram! O modelo relacional está funcionando corretamente. Você pode prosseguir com a migração de dados."
        : "❌ Alguns testes falharam. Verifique os detalhes acima.",
    });

  } catch (error) {
    console.error("[GET /api/testar-modelo]", error);
    return NextResponse.json(
      { resultados, sucesso: false, mensagem: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 },
    );
  }
}
