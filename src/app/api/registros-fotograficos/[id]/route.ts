import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createServerClient } from "@/lib/supabase";
import { requireAuth, resolveCentroCusto } from "@/lib/auth";
import { registrarLog } from "@/lib/logs";

const UpdateSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").max(255).optional(),
  descricao: z.string().max(1000).optional().nullable(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

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

function extractStoragePath(url: string): string | null {
  try {
    // Suporta tanto URLs públicas (/public/) quanto signed URLs (/sign/)
    const match = url.match(
      /\/storage\/v1\/object\/(?:public|sign)\/registros-fotograficos\/(.+)/,
    );
    if (!match || !match[1]) return null;
    // Remove query string (token) se houver
    return decodeURIComponent(match[1].split("?")[0]);
  } catch {
    return null;
  }
}

// ============================================================================
// PUT
// ============================================================================

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth("user");
    const { id } = await params;

    const formData = await request.formData();
    const nome = formData.get("nome") as string | null;
    const descricao = (formData.get("descricao") as string | null) || null;
    const urlsRemovidasRaw = formData.get("urls_removidas") as string | null;
    const files = formData.getAll("fotos");

    const validated = UpdateSchema.parse({
      nome: nome ?? undefined,
      descricao,
    });

    const supabase = createServerClient();

    // Busca o registro para verificar permissão
    const { data: existing, error: findError } = await supabase
      .from("registros_fotograficos")
      .select("*")
      .eq("id", id)
      .single();

    if (findError || !existing) {
      return NextResponse.json(
        { error: "Registro não encontrado" },
        { status: 404 },
      );
    }

    const centrosPermitidos = resolveCentroCusto(user, null);
    if (
      centrosPermitidos &&
      centrosPermitidos.length > 0 &&
      !centrosPermitidos.includes(existing.centro_custo)
    ) {
      return NextResponse.json(
        { error: "Acesso negado a este registro" },
        { status: 403 },
      );
    }

    let urlsAtuais: string[] = existing.urls || [];

    // ── Remover fotos marcadas ─────────────────────────────────────────────
    const urlsRemovidas: string[] = urlsRemovidasRaw
      ? JSON.parse(urlsRemovidasRaw)
      : [];

    if (urlsRemovidas.length > 0) {
      // Extrai os paths das URLs a remover para deletar do Storage
      const pathsToRemove: string[] = [];
      for (const url of urlsRemovidas) {
        const path = extractStoragePath(url);
        if (path) pathsToRemove.push(path);
      }

      if (pathsToRemove.length > 0) {
        const { error: removeError } = await supabase.storage
          .from("registros-fotograficos")
          .remove(pathsToRemove);

        if (removeError) {
          console.error("[DELETE STORAGE]", removeError);
        }
      }

      // Filtra as URLs do array comparando por path (não por string completa),
      // pois o banco tem URLs públicas e o frontend envia signed URLs
      const pathsRemovidos = urlsRemovidas
        .map(extractStoragePath)
        .filter(Boolean) as string[];

      urlsAtuais = urlsAtuais.filter((url) => {
        const path = extractStoragePath(url);
        return path && !pathsRemovidos.includes(path);
      });
    }

    // ── Adicionar novas fotos ──────────────────────────────────────────────
    const novasUrls: string[] = [];

    for (const entry of files) {
      if (typeof entry !== "object" || entry === null) continue;
      const file = entry as { size: number; name?: string; type?: string; arrayBuffer(): Promise<ArrayBuffer> };
      if (file.size === 0) continue;

      const safeName = sanitizeFileName(file.name || "foto");
      const storagePath = `${existing.centro_custo}/${id}/${Date.now()}_${safeName}`;

      const arrayBuffer = await file.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from("registros-fotograficos")
        .upload(storagePath, arrayBuffer, {
          contentType: file.type || "image/jpeg",
          upsert: false,
        });

      if (uploadError) {
        console.error("[UPLOAD STORAGE]", uploadError);
        throw new Error(`Falha ao enviar foto: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from("registros-fotograficos")
        .getPublicUrl(storagePath);

      novasUrls.push(publicUrlData.publicUrl);
    }

    const urlsFinais = [...urlsAtuais, ...novasUrls];

    if (urlsFinais.length === 0) {
      return NextResponse.json(
        { error: "O registro deve ter pelo menos uma foto" },
        { status: 400 },
      );
    }

    // ── Atualiza no banco ──────────────────────────────────────────────────
    const { data, error } = await supabase
      .from("registros_fotograficos")
      .update({
        ...(validated.nome !== undefined ? { nome: validated.nome } : {}),
        ...(validated.descricao !== undefined
          ? { descricao: validated.descricao }
          : {}),
        urls: urlsFinais,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    await registrarLog(
      user.re,
      "EDITAR",
      `Registro fotográfico editado: ${existing.nome} - CC: ${existing.centro_custo}` +
        `${urlsRemovidas.length > 0 ? ` (removidas: ${urlsRemovidas.length})` : ""}` +
        `${novasUrls.length > 0 ? ` (adicionadas: ${novasUrls.length})` : ""}`,
    );

    return NextResponse.json({ data });
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
    console.error("[PUT /registros-fotograficos/:id]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// ============================================================================
// DELETE
// ============================================================================

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth("user");
    const { id } = await params;

    const supabase = createServerClient();

    // Busca o registro para verificar permissão e obter URLs
    const { data: existing, error: findError } = await supabase
      .from("registros_fotograficos")
      .select("*")
      .eq("id", id)
      .single();

    if (findError || !existing) {
      return NextResponse.json(
        { error: "Registro não encontrado" },
        { status: 404 },
      );
    }

    const centrosPermitidos = resolveCentroCusto(user, null);
    if (
      centrosPermitidos &&
      centrosPermitidos.length > 0 &&
      !centrosPermitidos.includes(existing.centro_custo)
    ) {
      return NextResponse.json(
        { error: "Acesso negado a este registro" },
        { status: 403 },
      );
    }

    // Extrai os paths do Storage a partir das URLs públicas
    const paths: string[] = [];
    for (const url of existing.urls || []) {
      try {
        const path = extractStoragePath(url);
        if (path) paths.push(path);
      } catch {
        // ignora URLs inválidas
      }
    }

    if (paths.length > 0) {
      const { error: removeError } = await supabase.storage
        .from("registros-fotograficos")
        .remove(paths);

      if (removeError) {
        console.error("[DELETE STORAGE]", removeError);
      }
    }

    const { error } = await supabase
      .from("registros_fotograficos")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);

    await registrarLog(
      user.re,
      "REMOVER",
      `Registro fotográfico removido: ${existing.nome} - CC: ${existing.centro_custo}`,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    if (error instanceof Error && error.message === "FORBIDDEN")
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    console.error("[DELETE /registros-fotograficos/:id]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
