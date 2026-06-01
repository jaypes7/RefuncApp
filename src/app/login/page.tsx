"use client";

import { useState } from "react";
import { Lock, ArrowRight, Loader2, Eye, EyeOff, FlaskConical } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const DEMO_USERS = [
  { label: "Administrador", re: "admin@demo.com", senha: "demo123" },
  { label: "Coordenador",   re: "coordenador@demo.com", senha: "demo123" },
  { label: "Analista RH",   re: "rh@demo.com", senha: "demo123" },
] as const;

export default function LoginPage() {
  const { login, error: authError, isLoading } = useAuth();
  const [re, setRe] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [localError, setLocalError] = useState("");

  const handleDemoLogin = (re: string, senha: string) => {
    setRe(re);
    setSenha(senha);
    setLocalError("");
    login(re, senha);
  };

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
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* ── Coluna Esquerda (Branding) ── */}
      <div className="flex w-full flex-col items-center justify-center bg-primary px-6 py-10 text-center text-primary-foreground md:w-1/2 md:min-h-screen">
        <div className="max-w-md space-y-16">
          <div className="space-y-3">
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
            <p className="text-sm font-medium text-primary-foreground/90 md:text-base lg:text-lg">
              Controle, agilidade e segurança nas operações da sua unidade de trabalho
            </p>
          </div>
          <p className="text-xl font-semibold text-primary-foreground md:text-2xl lg:text-3xl">
            Fazer. Inovar. Solucionar.
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

          {/* ── Acesso rápido demo ── */}
          {DEMO_MODE && (
            <div className="mb-5 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
                <FlaskConical className="h-4 w-4" />
                Ambiente de demonstração — acesso rápido
              </div>
              <div className="flex flex-wrap gap-2">
                {DEMO_USERS.map((u) => (
                  <button
                    key={u.re}
                    type="button"
                    onClick={() => handleDemoLogin(u.re, u.senha)}
                    disabled={isLoading}
                    className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-100 disabled:opacity-50 dark:bg-amber-900/20 dark:text-amber-200 dark:hover:bg-amber-900/40"
                  >
                    {u.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                Todos usam a senha <code className="rounded bg-amber-200 px-1 dark:bg-amber-800">demo123</code>
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* RE / E-mail */}
            <div>
              <label htmlFor="re" className="field-label">
                {DEMO_MODE ? "E-mail de acesso" : "RE (Registro)"}
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="re"
                  type={DEMO_MODE ? "email" : "text"}
                  inputMode={DEMO_MODE ? "email" : "numeric"}
                  placeholder={DEMO_MODE ? "admin@demo.com" : "Ex: 000000"}
                  value={re}
                  onChange={(e) => {
                    setRe(e.target.value);
                    if (localError) setLocalError("");
                  }}
                  disabled={isLoading}
                  className="input-enterprise pl-9"
                  autoComplete={DEMO_MODE ? "email" : "off"}
                  required
                />
              </div>
            </div>

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
                  id="senha"
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="Digite sua senha"
                  value={senha}
                  onChange={(e) => {
                    setSenha(e.target.value);
                    if (localError) setLocalError("");
                  }}
                  disabled={isLoading}
                  className="input-enterprise pl-9 pr-9"
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

              {(localError || authError) && (
                <p className="mt-2 text-xs text-destructive">
                  {localError || authError}
                </p>
              )}
            </div>

            {/* Botão Entrar */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
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
      </div>
    </div>
  );
}
