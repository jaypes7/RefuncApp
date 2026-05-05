/**
 * ============================================================================
 * Cliente Moonshot (Kimi) API
 * ============================================================================
 *
 * Cliente HTTP leve para a API OpenAI-compatible da Moonshot.
 * Usa fetch nativo — sem dependência do SDK OpenAI.
 *
 * Endpoint: https://api.moonshot.ai/v1/chat/completions
 */

export const MOONSHOT_BASE_URL = "https://api.moonshot.ai/v1";
export const MOONSHOT_DEFAULT_MODEL = process.env.MOONSHOT_MODEL ?? "kimi-k2.5";

interface MoonshotMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface MoonshotResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
      reasoning_content?: string;
      reasoning?: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface ChatOptions {
  messages: MoonshotMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Envia uma requisição de chat completions para a Moonshot API.
 *
 * @throws Error em caso de falha na API ou resposta inválida.
 */
export async function chatCompletions(options: ChatOptions): Promise<string> {
  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey) {
    throw new Error("Variável de ambiente MOONSHOT_API_KEY é obrigatória");
  }

  const model = options.model ?? MOONSHOT_DEFAULT_MODEL;
  const maxTokens = options.maxTokens ?? 4096;

  const payload: Record<string, unknown> = {
    model,
    messages: options.messages,
    max_tokens: maxTokens,
  };

  if (options.temperature !== undefined) {
    payload.temperature = options.temperature;
  }

  // Desabilita thinking mode para modelos K2.5/K2.6
  payload.extra_body = {
    thinking: { type: "disabled" },
  };

  const res = await fetch(`${MOONSHOT_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "{}");
    throw new Error(`Moonshot API erro ${res.status}: ${text}`);
  }

  const data = (await res.json()) as MoonshotResponse;

  // Debug: loga estrutura da resposta no servidor
  console.log("[Moonshot] model:", data.model);
  console.log("[Moonshot] finish_reason:", data.choices?.[0]?.finish_reason);
  console.log("[Moonshot] content length:", data.choices?.[0]?.message?.content?.length ?? 0);
  console.log("[Moonshot] reasoning_content length:", data.choices?.[0]?.message?.reasoning_content?.length ?? 0);
  console.log("[Moonshot] reasoning length:", data.choices?.[0]?.message?.reasoning?.length ?? 0);

  const message = data.choices?.[0]?.message;
  if (!message) {
    throw new Error("Resposta inválida da Moonshot API: message ausente");
  }

  let content = message.content ?? "";

  // Se content vier vazio mas houver reasoning, usamos reasoning como fallback
  if (!content.trim() && (message.reasoning_content || message.reasoning)) {
    content = message.reasoning_content || message.reasoning || "";
  }

  if (typeof content !== "string") {
    throw new Error("Resposta inválida da Moonshot API: content ausente");
  }

  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("Moonshot API retornou conteúdo vazio");
  }

  return trimmed;
}
