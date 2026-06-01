import { NextResponse } from "next/server";

export const DEMO_MODE = process.env.DEMO_MODE === "true";

/** Resposta de leitura bem-sucedida com dados mock. */
export function demoOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Resposta de escrita bem-sucedida (POST/PUT/PATCH).
 * Ecoa os dados recebidos como se tivessem sido persistidos,
 * adicionando um id fictício quando não fornecido.
 */
export function demoWrite<T extends object>(data?: T): NextResponse {
  const id = crypto.randomUUID();
  return NextResponse.json(
    {
      ...(data ?? {}),
      id: (data as Record<string, unknown>)?.id ?? id,
      _demo: true,
    },
    { status: 201 },
  );
}

/** Resposta de deleção simulada. */
export function demoDelete(): NextResponse {
  return NextResponse.json({ success: true, _demo: true });
}

/** Operação bloqueada no modo demo (ex: reset destrutivo). */
export function demoBlocked(motivo: string): NextResponse {
  return NextResponse.json(
    {
      error: `Operação desabilitada no ambiente de demonstração: ${motivo}`,
      _demo: true,
    },
    { status: 403 },
  );
}

/** Lista vazia com metadados demo — para endpoints de exportação/import. */
export function demoEmpty(): NextResponse {
  return NextResponse.json([], { status: 200 });
}
