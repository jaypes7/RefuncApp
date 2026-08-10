/**
 * @deprecated Barrel de compatibilidade. Em código novo, importe direto de:
 *   - `@/lib/http`            → instância axios (`api`)
 *   - `@/types/api`           → tipos compartilhados (PaginatedResponse)
 *   - `@/services/<dominio>`  → tipos e funções de API do domínio
 */

export { api } from "./http";
export * from "@/types/api";
export * from "@/services/auth";
export * from "@/services/colaboradores";
export * from "@/services/dashboard";
export * from "@/services/checklist-mobilizacao";
export * from "@/services/config";
export * from "@/services/anotacoes";
export * from "@/services/banco-talentos";
export * from "@/services/colaboradores-restritos";
export * from "@/services/logistica";
export * from "@/services/treinamentos";
export * from "@/services/registros-fotograficos";
export * from "@/services/frota";
export * from "@/services/suprimentos";
