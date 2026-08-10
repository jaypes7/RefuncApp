"use client";

import { ThemeProvider } from "next-themes";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { useState } from "react";

function mensagemDeErro(error: unknown): string {
  if (isAxiosError(error)) {
    return error.response?.data?.error || "Erro ao comunicar com o servidor";
  }
  if (error instanceof Error && error.message) return error.message;
  return "Erro ao carregar dados";
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error, query) => {
            // 401 já é tratado pelo interceptor do axios (redirect para /login)
            if (isAxiosError(error) && error.response?.status === 401) return;
            toast.error(mensagemDeErro(error), {
              // 1 toast por recurso, mesmo com várias queries falhando juntas
              id: `query-error-${String(query.queryKey[0])}`,
            });
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 1000 * 30,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
