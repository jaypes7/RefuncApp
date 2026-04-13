import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { AuthProvider } from "@/contexts/AuthContext";
import { FilterProvider } from "@/contexts/FilterContext";
import { ConditionalLayout } from "@/components/conditional-layout";
import { AuthGlobalUI } from "@/components/auth-global-ui";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: "RefuncApp - Gestão de RH",
  description: "Sistema de gestão de recursos humanos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={ibmPlexSans.className}>
        <Providers>
          <AuthProvider>
            <FilterProvider>
              <ConditionalLayout>{children}</ConditionalLayout>
              <AuthGlobalUI />
              <Toaster position="top-right" richColors />
              <Analytics />
              <SpeedInsights />
            </FilterProvider>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
