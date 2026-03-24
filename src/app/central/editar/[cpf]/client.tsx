/**
 * ============================================================================
 * CLIENT COMPONENT: EditColaboradorPage
 * ============================================================================
 *
 * Responsabilidade:
 *   - Buscar os dados do colaborador pelo CPF via API.
 *   - Renderizar o modal de edição (EditColaboradorModal) com os dados
 *     pré-carregados.
 *   - Após salvar com sucesso, redirecionar de volta para /central.
 *
 * Por que separado do page.tsx (Server Component)?
 *   O Next.js App Router requer que useState/useEffect fiquem em
 *   Client Components. O Server Component da rota fica limpo e leve.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { colaboradoresApi, type Colaborador } from "@/lib/axios";
import { EditColaboradorModal } from "@/components/EditColaboradorModal";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// ============================================================================
// PROPS
// ============================================================================

interface EditColaboradorPageProps {
  /** CPF já sanitizado (apenas dígitos, 11 chars) vindo do Server Component */
  cpf: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function EditColaboradorPage({ cpf }: EditColaboradorPageProps) {
  const router = useRouter();

  // Estado do modal — fecha quando o usuário dispensa (dados chegaram via query)
  const [dismissed, setDismissed] = useState(false);

  // Busca os dados do colaborador pelo CPF
  const { data, isLoading, isError } = useQuery<{ data: Colaborador }>({
    queryKey: ["colaborador", cpf],
    queryFn: async () => {
      const response = await colaboradoresApi.buscar(cpf);
      return response.data;
    },
    retry: 1,
  });

  // Deriva o estado do modal a partir dos dados — sem useEffect
  const modalOpen = !dismissed && !!data?.data;

  // Quando o modal fechar → volta para /central
  const handleModalClose = (open: boolean) => {
    if (!open) {
      setDismissed(true);
      router.push("/central");
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="flex flex-col items-center justify-center gap-4 py-32">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Carregando dados do colaborador...
          </p>
        </div>
      </ProtectedRoute>
    );
  }

  // ── Erro ─────────────────────────────────────────────────────────────────

  if (isError || !data?.data) {
    return (
      <ProtectedRoute>
        <div className="flex flex-col items-center justify-center gap-4 py-32">
          <AlertCircle className="h-10 w-10 text-destructive/60" />
          <p className="text-lg font-medium text-foreground">
            Colaborador não encontrado
          </p>
          <p className="text-sm text-muted-foreground">
            CPF: <span className="font-mono">{cpf}</span>
          </p>
          <Button
            variant="outline"
            className="mt-2 gap-2"
            onClick={() => router.push("/central")}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Central
          </Button>
        </div>
      </ProtectedRoute>
    );
  }

  // ── Sucesso → abre modal com dados pré-carregados ─────────────────────────

  return (
    <ProtectedRoute>
      {/*
       * Fundo vazio — o fluxo principal é o modal.
       * Se o usuário fechar sem salvar, é redirecionado para /central.
       */}
      <div className="flex flex-col items-center justify-center gap-4 py-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Abrindo editor...</p>
      </div>

      <EditColaboradorModal
        colaborador={data.data}
        open={modalOpen}
        onOpenChange={handleModalClose}
      />
    </ProtectedRoute>
  );
}
