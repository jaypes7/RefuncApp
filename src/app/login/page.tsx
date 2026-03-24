"use client";

import { useState } from "react";
import { Lock, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const [re, setRe] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = re.trim();
    if (!trimmed) {
      setError("Informe seu RE para continuar.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      await login(trimmed);
      // Redirect is handled inside login()
    } catch {
      setError("Ocorreu um erro ao tentar entrar. Tente novamente.");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background">
      {/* ── Decorative background orbs ── */}
      <div className="orb h-96 w-96 bg-primary/10 -top-20 -left-20" />
      <div className="orb h-80 w-80 bg-blue-500/5 bottom-20 right-10" />
      <div className="orb h-64 w-64 bg-primary/5 top-1/2 left-1/3" />

      {/* ── Main content ── */}
      <div className="relative z-10 w-full max-w-sm px-6">
        {/* Logo + headline */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-linear-to-tr from-amber-500 to-yellow-300 shadow-lg shadow-amber-500/30">
            <span className="text-3xl font-bold text-gray-900">R</span>
          </div>

          <h1 className="mb-1 text-3xl font-bold tracking-tight text-foreground">
            Acesso ao Sistema
          </h1>
          <p className="text-sm font-medium text-muted-foreground">
            Insira seu RE para continuar
          </p>
        </div>

        {/* ── Glassmorphism card ── */}
        <div className="glass-card rounded-xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* RE field */}
            <div className="space-y-2">
              <label
                htmlFor="re"
                className="block px-1 text-sm font-medium text-foreground/80"
              >
                RE (Registro)
              </label>

              <div className="relative">
                {/* Lock icon */}
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </div>

                <Input
                  id="re"
                  type="text"
                  inputMode="numeric"
                  placeholder="Ex: 000000"
                  value={re}
                  onChange={(e) => {
                    setRe(e.target.value);
                    if (error) setError("");
                  }}
                  disabled={isLoading}
                  className="h-12 border-white/10 bg-white/5 pl-10 text-base
                             placeholder:text-muted-foreground/60
                             focus-visible:border-primary/60
                             focus-visible:ring-primary/25
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  autoComplete="off"
                  required
                />
              </div>

              {/* Inline error message */}
              {error && (
                <p className="px-1 text-xs text-destructive">{error}</p>
              )}
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="mt-2 h-12 w-full gap-2 text-base font-bold
                         shadow-md shadow-primary/20
                         hover:brightness-110 active:scale-[0.98]
                         transition-all duration-150
                         disabled:opacity-70 disabled:cursor-not-allowed
                         disabled:active:scale-100"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando…
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            {/* Bottom row – forgot / version */}
            <div className="flex items-center justify-between border-t border-white/5 pt-4 text-xs text-muted-foreground">
              <a
                href="#"
                className="transition-colors duration-150 hover:text-primary"
              >
                Esqueci meu acesso
              </a>
              <span className="opacity-50">RefuncApp v2.4.0</span>
            </div>
          </form>
        </div>

        {/* Support link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Precisa de ajuda?{" "}
            <a
              href="#"
              className="text-primary/80 underline underline-offset-4 transition-colors duration-150 hover:text-primary"
            >
              Contate o suporte
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
