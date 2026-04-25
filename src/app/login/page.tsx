"use client";

import { useState } from "react";
import { Lock, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
<<<<<<< HEAD
=======
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
>>>>>>> origin/main
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const { login, error: authError, isLoading } = useAuth();
  const [re, setRe] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedRE = re.trim();
    const trimmedSenha = senha.trim();

    if (!trimmedRE) {
      setLocalError("Informe seu RE para continuar.");
      return;
    }

    if (!trimmedSenha) {
      setLocalError("Informe sua senha para continuar.");
      return;
    }

    setLocalError("");
    await login(trimmedRE, trimmedSenha);
  };

  return (
<<<<<<< HEAD
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* ── Coluna Esquerda (Branding) ── */}
      <div className="flex w-full flex-col items-center justify-center bg-primary px-6 py-10 text-center text-primary-foreground md:w-1/2 md:min-h-screen">
        <div className="max-w-md space-y-4">
          <h1 className="text-3xl leading-tight sm:text-4xl md:text-5xl">
            <span className="block font-light tracking-wide">
              GESTÃO DE
            </span>
            <span className="block text-4xl font-bold uppercase tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
              MOBILIZAÇÃO
            </span>
            <span className="block font-light tracking-wide">
              DE CONTRATOS
            </span>
          </h1>
          <p className="text-sm font-medium text-primary-foreground/80 md:text-base">
            Controle, agilidade e segurança nas operações da sua unidade de trabalho.
          </p>
        </div>
      </div>

      {/* ── Coluna Direita (Autenticação) ── */}
      <div className="flex w-full flex-col items-center justify-center bg-background px-6 py-10 md:w-1/2 md:min-h-screen">
        <div className="glass-card w-full max-w-sm p-8">
          {/* Header do Formulário */}
          <div className="mb-6 text-center">
            {/* Logo GPI */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/30">
              <span className="text-2xl font-bold text-primary-foreground">
                GPI
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Acesso ao Sistema
            </h2>
            <small className="mt-1 block text-sm font-medium">
              Insira seu RE e senha para continuar
            </small>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* RE */}
            <div>
              <label htmlFor="re" className="field-label">
                RE (Registro)
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </div>
                <input
=======
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background">
      {/* ── Decorative background orbs ── */}
      <div className="orb h-96 w-96 bg-primary/10 -top-20 -left-20" />
      <div className="orb h-80 w-80 bg-[#19365b]/5 bottom-20 right-10" />
      <div className="orb h-64 w-64 bg-primary/5 top-1/2 left-1/3" />

      {/* ── Main content ── */}
      <div className="relative z-10 w-full max-w-sm px-6">
        {/* Logo + headline */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-18 w-20 items-center justify-center rounded-xl bg-[#ff460a] shadow-lg shadow-[#ff460a]/30">
            <span className="text-3xl font-bold text-white">GPI</span>
          </div>

          <h1 className="mb-1 text-3xl font-bold tracking-tight text-foreground">
            Acesso ao Sistema
          </h1>
          <p className="text-sm font-medium text-muted-foreground">
            Insira seu RE e senha para continuar
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
>>>>>>> origin/main
                  id="re"
                  type="text"
                  inputMode="numeric"
                  placeholder="Ex: 000000"
                  value={re}
                  onChange={(e) => {
                    setRe(e.target.value);
                    if (localError) setLocalError("");
                  }}
                  disabled={isLoading}
<<<<<<< HEAD
                  className="input-enterprise pl-9"
=======
                  className="h-12 border-border bg-muted/30 pl-10 text-base
                             placeholder:text-muted-foreground/60
                             focus-visible:border-primary/60
                             focus-visible:ring-primary/25
                             disabled:opacity-50 disabled:cursor-not-allowed"
>>>>>>> origin/main
                  autoComplete="off"
                  required
                />
              </div>
            </div>

<<<<<<< HEAD
            {/* Senha */}
            <div>
              <label htmlFor="senha" className="field-label">
                Senha
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </div>
                <input
=======
            {/* Senha field */}
            <div className="space-y-2">
              <label
                htmlFor="senha"
                className="block px-1 text-sm font-medium text-foreground/80"
              >
                Senha
              </label>

              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </div>

                <Input
>>>>>>> origin/main
                  id="senha"
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="Digite sua senha"
                  value={senha}
                  onChange={(e) => {
                    setSenha(e.target.value);
                    if (localError) setLocalError("");
                  }}
                  disabled={isLoading}
<<<<<<< HEAD
                  className="input-enterprise pl-9 pr-9"
=======
                  className="h-12 border-border bg-muted/30 pl-10 pr-10 text-base
                             placeholder:text-muted-foreground/60
                             focus-visible:border-primary/60
                             focus-visible:ring-primary/25
                             disabled:opacity-50 disabled:cursor-not-allowed"
>>>>>>> origin/main
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setMostrarSenha((v) => !v)}
                  disabled={isLoading}
                  className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed"
                >
                  {mostrarSenha ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

<<<<<<< HEAD
              {(localError || authError) && (
                <p className="mt-2 text-xs text-destructive">
=======
              {/* Inline error message */}
              {(localError || authError) && (
                <p className="px-1 text-xs text-destructive">
>>>>>>> origin/main
                  {localError || authError}
                </p>
              )}
            </div>

<<<<<<< HEAD
            {/* Botão Entrar */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
=======
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
>>>>>>> origin/main
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
<<<<<<< HEAD
            </button>

            {/* Footer */}
            <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row">
              <a
                href="#"
                className="text-xs text-primary underline-offset-4 hover:underline"
              >
                Esqueceu a senha? Contate o suporte
              </a>
              <span className="manserv-footer">RefuncApp v2.4.0</span>
            </div>
          </form>
        </div>
=======
            </Button>

            {/* Bottom row – version */}
            <div className="flex items-center justify-end border-t border-border pt-4 text-xs text-muted-foreground">
              <span className="opacity-50">RefuncApp v2.4.0</span>
            </div>
          </form>
        </div>

        {/* Support link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Esqueceu a senha?{" "}
            <a
              href="#"
              className="text-primary/80 underline underline-offset-4 transition-colors duration-150 hover:text-primary"
            >
              Contate o suporte
            </a>
          </p>
        </div>
>>>>>>> origin/main
      </div>
    </div>
  );
}
