import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createServerClient } from "@/lib/supabase";
import { requireAuth, resolveCentroCusto } from "@/lib/auth";
import { registrarLog } from "@/lib/logs";
import { RegistroFotograficoSchema } from "@/lib/schemas";

// ============================================================================
// HELPERS
// ============================================================================

function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_");
}

// ============================================================================
// GET
// ============================================================================

// Extrai o path relativo no Storage a partir da URL pública salva no banco
function extractStoragePath(publicUrl: string): string | null {
  try {
    const match = publicUrl.match(
      /\/storage\/v1\/object\/public\/registros-fotograficos\/(.+)/,
    );
    return match && match[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth("user");

    const { searchParams } = new URL(request.url);
    const ccParam = searchParams.get("centro_custo") ?? null;

    const centros = resolveCentroCusto(user, ccParam);

    const supabase = createServerClient();

    let query = supabase
      .from("registros_fotograficos")
      .select("*")
      .order("created_at", { ascending: false });

    if (centros && centros.length > 0) {
      query = query.in("centro_custo", centros);
    }

    const { data: registros, error } = await query;

    if (error) throw new Error(error.message);

    // Gera signed URLs para todas as fotos (bucket privado)
    const registrosComUrlsAssinadas = await Promise.all(
      (registros ?? []).map(async (registro) => {
        const paths = (registro.urls || [])
          .map(extractStoragePath)
          .filter(Boolean) as string[];

        if (paths.length === 0) {
          return { ...registro, urls: [] };
        }

        const { data: signedData, error: signedError } = await supabase.storage
          .from("registros-fotograficos")
          .createSignedUrls(paths, 3600); // 1 hora de validade

        if (signedError) {
          console.error("[SIGNED URLS]", signedError);
          return { ...registro, urls: [] };
        }

        const signedUrls = (signedData || [])
          .map((item) => item.signedUrl)
          .filter(Boolean);

        return { ...registro, urls: signedUrls };
      }),
    );

    return NextResponse.json({ data: registrosComUrlsAssinadas });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    if (error instanceof Error && error.message === "FORBIDDEN")
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    console.error("[GET /registros-fotograficos]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// ============================================================================
// POST
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth("user");

    const formData = await request.formData();
    const nome = formData.get("nome") as string | null;
    const descricao = (formData.get("descricao") as string | null) || null;
    const centro_custo = formData.get("centro_custo") as string | null;
    const files = formData.getAll("fotos") as File[];

    const validated = RegistroFotograficoSchema.parse({
      nome,
      descricao,
      centro_custo,
    });

    // Verifica se o usuário tem permissão para o centro de custo
    const centrosPermitidos = resolveCentroCusto(user, null);
    if (
      centrosPermitidos &&
      centrosPermitidos.length > 0 &&
      !centrosPermitidos.includes(validated.centro_custo)
    ) {
      return NextResponse.json(
        { error: "Centro de custo não autorizado" },
        { status: 403 },
      );
    }

    console.log("[POST /registros-fotograficos] Arquivos recebidos:", files.length);

    const supabase = createServerClient();
    const registroId = crypto.randomUUID();
    const urls: string[] = [];

    // Upload das fotos para o Storage
    for (const entry of files) {
      if (typeof entry !== "object" || entry === null) {
        console.warn("[POST /registros-fotograficos] Item ignorado — não é File/Blob:", typeof entry);
        continue;
      }
      const file = entry as { size: number; name?: string; type?: string; arrayBuffer(): Promise<ArrayBuffer> };
      if (file.size === 0) {
        console.warn("[POST /registros-fotograficos] Arquivo vazio ignorado");
        continue;
      }

      const safeName = sanitizeFileName(file.name || "foto");
      const storagePath = `${validated.centro_custo}/${registroId}/${Date.now()}_${safeName}`;

      console.log("[POST /registros-fotograficos] Enviando:", storagePath, "| Tamanho:", file.size, "| Tipo:", file.type);

      // Converte para ArrayBuffer para evitar incompatibilidade File/Blob entre Next.js e Supabase
      const arrayBuffer = await file.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from("registros-fotograficos")
        .upload(storagePath, arrayBuffer, {
          contentType: file.type || "image/jpeg",
          upsert: false,
        });

      if (uploadError) {
        console.error("[UPLOAD STORAGE] Erro no upload:", JSON.stringify(uploadError));
        throw new Error(`Falha ao enviar foto: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from("registros-fotograficos")
        .getPublicUrl(storagePath);

      urls.push(publicUrlData.publicUrl);
      console.log("[POST /registros-fotograficos] Upload OK:", publicUrlData.publicUrl);
    }

    console.log("[POST /registros-fotograficos] URLs geradas:", urls.length);

    if (urls.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma foto válida foi enviada" },
        { status: 400 },
      );
    }

    console.log("[POST /registros-fotograficos] Inserindo no banco...");

    const { data, error } = await supabase
      .from("registros_fotograficos")
      .insert({
        id: registroId,
        nome: validated.nome,
        descricao: validated.descricao,
        centro_custo: validated.centro_custo,
        urls,
        created_by: user.re,
      })
      .select()
      .single();

    if (error) {
      console.error("[POST /registros-fotograficos] Erro no insert:", JSON.stringify(error));
      throw new Error(error.message);
    }

    console.log("[POST /registros-fotograficos] Registro criado:", registroId);

    await registrarLog(
      user.re,
      "ADICIONAR",
      `Registro fotográfico criado: ${validated.nome} (${urls.length} foto(s)) - CC: ${validated.centro_custo}`,
    );

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 },
      );
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    if (error instanceof Error && error.message === "FORBIDDEN")
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    console.error("[POST /registros-fotograficos]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
