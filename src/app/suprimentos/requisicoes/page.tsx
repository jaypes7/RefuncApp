"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Package, ArrowLeft } from "lucide-react";
import { requisicoesSuprimentosApi, type Requisicao } from "@/lib/axios";
import { formatDateBR } from "@/lib/date-utils";

// ============================================================================
// STATUS CONFIG
// ============================================================================

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  rascunho:     { label: "Rascunho",    variant: "secondary", className: "bg-gray-100 text-gray-700 border-gray-300" },
  aberta:       { label: "Aberta",      variant: "default",   className: "bg-blue-100 text-blue-700 border-blue-300" },
  em_andamento: { label: "Em Andamento",variant: "default",   className: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  concluida:    { label: "Concluída",   variant: "default",   className: "bg-green-100 text-green-700 border-green-300" },
  cancelada:    { label: "Cancelada",   variant: "destructive", className: "bg-red-100 text-red-700 border-red-300" },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: "outline" as const, className: "" };
  return (
    <Badge variant={config.variant} className={`text-xs font-medium ${config.className}`}>
      {config.label}
    </Badge>
  );
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  try {
    const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
    return formatDateBR(new Date(year, month - 1, day));
  } catch {
    return dateStr;
  }
}

// ============================================================================
// PAGE
// ============================================================================

function RequisicoesList() {
  const router = useRouter();
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [page, setPage]         = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["suprimentos-requisicoes", page, search, statusFilter],
    queryFn: () =>
      requisicoesSuprimentosApi
        .listar({
          page,
          limit: 20,
          search: search || undefined,
          status: statusFilter === "todos" ? undefined : statusFilter,
        })
        .then((r) => r.data),
  });

  const requisicoes: Requisicao[] = data?.data ?? [];
  const totalPages = data?.pagination.totalPages ?? 1;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6 text-orange-500" />
              Requisições Suprimentos
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gerencie as requisições de materiais e serviços
            </p>
          </div>
          <Button onClick={() => router.push("/suprimentos/requisicoes/nova")} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Requisição
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {isLoading ? "Carregando..." : `${data?.pagination.total ?? 0} requisição(ões)`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Coordenador</TableHead>
                  <TableHead>Data Abertura</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criada em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : requisicoes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      Nenhuma requisição encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  requisicoes.map((req) => (
                    <TableRow
                      key={req.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/suprimentos/requisicoes/${req.id}`)}
                    >
                      <TableCell className="font-medium">{req.titulo}</TableCell>
                      <TableCell>{req.coordenador}</TableCell>
                      <TableCell>{formatDate(req.data_abertura)}</TableCell>
                      <TableCell><StatusBadge status={req.status} /></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDate(req.created_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {page} de {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                  Próxima
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <RequisicoesList />
    </ProtectedRoute>
  );
}
