// src/app/configuracoes/page.tsx
"use client";

import { useState } from "react";
import {
  Activity,
  Bed,
  Briefcase,
  Building2,
  FileText,
  Package,
  Settings,
  Users,
} from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useFilter } from "@/contexts/FilterContext";

import { AcessosTab } from "./_components/AcessosTab";
import { CargosTab } from "./_components/CargosTab";
import { CategoriasSupTab } from "./_components/CategoriasSupTab";
import { ClinicasTab } from "./_components/ClinicasTab";
import { HoteisTab } from "./_components/HoteisTab";
import { LogsTab } from "./_components/LogsTab";
import { ProjetoTab } from "./_components/ProjetoTab";
import { SistemaTab } from "./_components/SistemaTab";

// Abas renderizadas sob demanda: o conteúdo (e suas queries) só monta quando a aba é aberta.
const TABS = [
  { value: "projeto", label: "Projeto", icon: Building2, content: <ProjetoTab /> },
  { value: "acessos", label: "Acessos", icon: Users, content: <AcessosTab /> },
  { value: "clinicas", label: "Clínicas", icon: Activity, content: <ClinicasTab /> },
  { value: "hoteis", label: "Hotéis", icon: Bed, content: <HoteisTab /> },
  { value: "logs", label: "Logs", icon: FileText, content: <LogsTab /> },
  { value: "sistema", label: "Sistema", icon: Settings, content: <SistemaTab /> },
  { value: "cargos", label: "Cargos", icon: Briefcase, content: <CargosTab /> },
  { value: "categorias-sup", label: "Categorias SUP", icon: Package, content: <CategoriasSupTab /> },
];

export default function ConfiguracoesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { isReady: filterReady } = useFilter();
  const [activeTab, setActiveTab] = useState("projeto");

  // ── Guard: aguarda auth resolver, depois verifica perfil admin ─────────────
  if (authLoading) return null;

  if (user?.perfil !== "admin") {
    return (
      <ProtectedRoute>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <Settings className="h-8 w-8 text-destructive/60" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Acesso Negado</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Apenas administradores podem visualizar esta página.
          </p>
        </div>
      </ProtectedRoute>
    );
  }

  if (!filterReady) {
    return (
      <ProtectedRoute>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
          <Settings className="h-8 w-8 text-muted-foreground animate-pulse" />
          <p className="text-sm text-muted-foreground">Carregando projeto...</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="w-full max-w-6xl mx-auto p-6 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie configurações do sistema, projetos, acessos e integrações.
          </p>
        </div>

        <Card className="glass-card">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <CardHeader className="pb-0">
              <TabsList className="w-full flex justify-start gap-2 bg-transparent border-b border-border/50 pb-2 rounded-none h-auto">
                {TABS.map(({ value, label, icon: Icon }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </CardHeader>

            <CardContent className="p-6">
              {TABS.map(({ value, content }) => (
                <TabsContent key={value} value={value} className="w-full mt-10 space-y-8">
                  {content}
                </TabsContent>
              ))}
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
