import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { buildHeaderMap, sanitizeCPF, sanitizeDate, type RawRow } from "@/lib/import-utils";
import { requireAuth } from "@/lib/auth";

function toStr(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  return String(value).trim();
}

function toInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return isNaN(n) ? null : Math.floor(n);
}

function getBySchema(row: RawRow, headerMap: Map<string, string>, schemaId: string): unknown {
  for (const [header, schema] of headerMap.entries()) {
    if (schema === schemaId) return row[header];
  }
  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth("admin");

    const body = await request.json();
    const rows: RawRow[] = Array.isArray(body.rows) ? body.rows : [];

    if (rows.length === 0) {
      return NextResponse.json({ error: "Nenhuma linha recebida" }, { status: 400 });
    }

    const headerMap = buildHeaderMap(Object.keys(rows[0] ?? {}));

    const records: Array<Record<string, unknown>> = [];
    const erros: Array<{ linha: number; motivo: string }> = [];
    const seenCpfs = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const linha = i + 2;

      const nome = toStr(getBySchema(row, headerMap, "nome") ?? "");
      if (!nome) {
        erros.push({ linha, motivo: "Nome ausente, linha ignorada" });
        continue;
      }

      const cpfRaw = sanitizeCPF(getBySchema(row, headerMap, "cpf") ?? "");

      if (cpfRaw && seenCpfs.has(cpfRaw)) {
        erros.push({ linha, motivo: `CPF ${cpfRaw} duplicado na planilha, ignorado` });
        continue;
      }
      if (cpfRaw) seenCpfs.add(cpfRaw);

      records.push({
        pessoa: toStr(getBySchema(row, headerMap, "pessoa") ?? "") || null,
        nome,
        idade: toInt(getBySchema(row, headerMap, "idade") ?? null),
        dt_nasc: sanitizeDate(getBySchema(row, headerMap, "dt_nasc") ?? null),
        cpf: cpfRaw || null,
        municipio: toStr(getBySchema(row, headerMap, "municipio") ?? "") || null,
        uf: toStr(getBySchema(row, headerMap, "uf") ?? "") || null,
        telefone: toStr(getBySchema(row, headerMap, "telefone") ?? "").replace(/\D/g, "") || null,
      });
    }

    if (records.length === 0) {
      return NextResponse.json({
        inseridos: 0, atualizados: 0,
        ignorados: rows.length, erros, total: rows.length,
      });
    }

    const supabase = createServerClient();

    // Separa registros com CPF (upsert) dos sem CPF (insert simples)
    const comCpf = records.filter((r) => r.cpf);
    const semCpf = records.filter((r) => !r.cpf);

    // Conta existentes para o relatório
    const cpfsParaBuscar = comCpf.map((r) => r.cpf as string);
    const { data: existing } = cpfsParaBuscar.length > 0
      ? await supabase.from("banco_talentos").select("cpf").in("cpf", cpfsParaBuscar)
      : { data: [] };

    const existingCpfs = new Set((existing ?? []).map((r) => r.cpf));
    const atualizados = comCpf.filter((r) => existingCpfs.has(r.cpf as string)).length;
    const inseridos = records.length - atualizados;

    // Upsert somente dos registros com CPF
    if (comCpf.length > 0) {
      const { error: upsertError } = await supabase
        .from("banco_talentos")
        .upsert(comCpf, { onConflict: "cpf", ignoreDuplicates: false });

      if (upsertError) throw new Error(`Supabase upsert: ${upsertError.message}`);
    }

    // Insert simples dos sem CPF
    if (semCpf.length > 0) {
      const { error: insertError } = await supabase
        .from("banco_talentos")
        .insert(semCpf);

      if (insertError) throw new Error(`Supabase insert: ${insertError.message}`);
    }

    return NextResponse.json({
      inseridos,
      atualizados,
      ignorados: rows.length - records.length,
      erros,
      total: rows.length,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    if (error instanceof Error && error.message === "FORBIDDEN")
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[POST /banco-talentos/import]", msg);
    return NextResponse.json({ error: `Erro interno: ${msg}` }, { status: 500 });
  }
}
