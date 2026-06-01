import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { AuthProvider } from "@/contexts/AuthContext";
import { FilterProvider } from "@/contexts/FilterContext";
import { ConditionalLayout } from "@/components/conditional-layout";
import { AuthGlobalUI } from "@/components/auth-global-ui";
import { DemoBanner } from "@/components/DemoBanner";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const metadata: Metadata = {
  title: "RefuncApp - Gestão de Mobilização",
  description: "Sistema de gestão de mobilização de contratos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans" style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
        <Providers>
          <AuthProvider>
            <FilterProvider>
              {DEMO_MODE && <DemoBanner />}
              <ConditionalLayout>{children}</ConditionalLayout>
              <AuthGlobalUI />
              <Toaster position="top-right" richColors closeButton />
              <Analytics />
              <SpeedInsights />
            </FilterProvider>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
