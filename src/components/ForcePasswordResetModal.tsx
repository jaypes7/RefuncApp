"use client";

import { useState } from "react";
import { Loader2, Lock, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/axios";
import { toast } from "sonner";

interface ForcePasswordResetModalProps {
  open: boolean;
  onSuccess: () => void;
}

export function ForcePasswordResetModal({
  open,
  onSuccess,
}: ForcePasswordResetModalProps) {
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarNova, setMostrarNova] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (novaSenha.length < 6) {
      setErro("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    setIsLoading(true);
    try {
      await authApi.resetPassword(novaSenha);
      toast.success("Senha redefinida com sucesso!");
      setNovaSenha("");
      setConfirmarSenha("");
      onSuccess();
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { error?: string } };
        message?: string;
      };
      setErro(
        e.response?.data?.error ||
          e.message ||
          "Erro ao redefinir senha. Tente novamente.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Redefinir Senha
          </DialogTitle>
          <DialogDescription>
            Este é o seu primeiro acesso ou sua senha foi resetada por um
            administrador. Por segurança, defina uma nova senha pessoal para
            continuar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <label
              htmlFor="nova-senha"
              className="text-sm font-medium text-foreground"
            >
              Nova senha
            </label>
            <div className="relative">
              <Input
                id="nova-senha"
                type={mostrarNova ? "text" : "password"}
                placeholder="Digite sua nova senha"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                disabled={isLoading}
                className="pr-10"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setMostrarNova((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-muted-foreground hover:text-foreground"
              >
                {mostrarNova ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="confirmar-senha"
              className="text-sm font-medium text-foreground"
            >
              Confirmar nova senha
            </label>
            <div className="relative">
              <Input
                id="confirmar-senha"
                type={mostrarConfirmar ? "text" : "password"}
                placeholder="Repita a nova senha"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                disabled={isLoading}
                className="pr-10"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setMostrarConfirmar((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-muted-foreground hover:text-foreground"
              >
                {mostrarConfirmar ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {erro && (
            <p className="text-xs text-destructive">{erro}</p>
          )}

          <DialogFooter>
            <Button
              type="submit"
              disabled={isLoading || !novaSenha || !confirmarSenha}
              className="w-full sm:w-auto gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando…
                </>
              ) : (
                "Salvar nova senha"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
