"use client";

import { useAuth } from "@/contexts/AuthContext";
import { ForcePasswordResetModal } from "@/components/ForcePasswordResetModal";

export function AuthGlobalUI() {
  const { user, refreshUser } = useAuth();

  const precisaRedefinir = user?.precisaRedefinirSenha ?? false;

  return (
    <ForcePasswordResetModal
      open={precisaRedefinir}
      onSuccess={refreshUser}
    />
  );
}
