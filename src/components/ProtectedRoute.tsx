"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

// ── Loading skeleton shown while the auth state is being resolved ─────────────

function AuthSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-8">
      {/* Simulated page header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>

      {/* Simulated toolbar */}
      <div className="flex gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Simulated table rows */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ── ProtectedRoute ────────────────────────────────────────────────────────────

/**
 * Wrap any page that requires authentication with this component.
 * - While the auth state is being resolved (isLoading), shows a skeleton UI.
 * - If the user is not authenticated, redirects to /login.
 * - If authenticated, renders children normally.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Still checking localStorage — avoid a flash redirect
  if (isLoading) {
    return <AuthSkeleton />;
  }

  // Not authenticated — render nothing while the redirect fires
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
