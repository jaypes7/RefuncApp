/**
 * ============================================================================
 * API: POST /api/auth/login
 * ============================================================================
 *
 * Valida o RE digitado contra a aba "users_permitidos" e gera JWT.
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSheetData, SHEETS } from "@/lib/sheets";
import { LoginSchema } from "@/lib/schemas";
import { generateToken, setAuthCookie } from "@/lib/auth";
import { logLogin } from "@/lib/logs";

// ============================================================================
// POST /api/auth/login
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Verifica variáveis de ambiente
    if (!process.env.JWT_SECRET) {
      console.error("[API Login] JWT_SECRET não configurado");
      return NextResponse.json(
        { error: "Erro de configuração do servidor" },
        { status: 500 }
      );
    }
    console.log("[API Login] JWT_SECRET configurado");

    // Parse do body
    const body = await request.json();
    console.log("[API Login] Recebido:", body);

    // Validação com Zod
    const { re } = LoginSchema.parse(body);
    console.log("[API Login] RE validado:", re);

    // Busca RE na aba users_permitidos
    console.log("[API Login] Buscando na aba:", SHEETS.USERS_PERMITIDOS);
    const users = await getSheetData(SHEETS.USERS_PERMITIDOS);
    console.log("[API Login] Usuários encontrados:", users.length);
    console.log("[API Login] Primeiras linhas:", users.slice(0, 5));

    // Procura o RE (assume que RE está na primeira coluna)
    // Remove espaços e converte para string para comparação
    const reLimpo = String(re).trim();
    console.log("[API Login] Buscando RE:", reLimpo, "(tipo:", typeof reLimpo, ")");
    
    const userFound = users.find((row) => {
      const reNaPlanilha = row[0] ? String(row[0]).trim() : "";
      console.log("[API Login] Comparando:", reNaPlanilha, "===", reLimpo, "?", reNaPlanilha === reLimpo);
      return reNaPlanilha === reLimpo;
    });
    console.log("[API Login] Usuário encontrado:", userFound ? "Sim" : "Não");

    if (!userFound) {
      // Mensagem genérica por segurança (não revelar se RE existe)
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      );
    }

    // Extrai dados do usuário (assume: RE, Nome, Perfil)
    const [, nome, perfil] = userFound;

    // Gera token JWT
    const token = await generateToken({
      re,
      nome: nome || undefined,
      perfil: perfil || undefined,
    });

    // Define cookie httpOnly
    await setAuthCookie(token);

    // Registra log de login
    await logLogin(re);

    // Retorna sucesso (sem expor o token no body)
    return NextResponse.json(
      {
        success: true,
        user: {
          re,
          nome: nome || null,
          perfil: perfil || null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API Login] Erro:", error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 }
      );
    }

    // Retorna erro detalhado para debug
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json(
      { error: "Erro interno do servidor", details: errorMessage },
      { status: 500 }
    );
  }
}
