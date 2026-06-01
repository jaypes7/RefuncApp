/**
 * demoRepository — camada única de acesso a dados fictícios.
 *
 * Todas as API routes em DEMO_MODE chamam este módulo
 * em vez do Supabase. Os dados são estáticos (em memória) e
 * não persistem entre reloads — comportamento esperado em sandbox.
 */

export { findDemoUserByRe, validateDemoCredentials } from "./data/usuarios";
export type { DemoUser } from "./data/usuarios";

export {
  DEMO_COLABORADORES,
  listColaboradores,
  getColaborador,
} from "./data/colaboradores";
export type { DemoColaborador } from "./data/colaboradores";

export {
  DEMO_CONFIG,
  DEMO_ETAPAS,
  DEMO_GRUPOS_ETAPAS,
  DEMO_CLINICAS,
  DEMO_HOTEIS,
  DEMO_CENTROS_CUSTO,
} from "./data/config";

export {
  getDashboardPrincipal,
  getDashboardRH,
  getDashboardLogistica,
  getDashboardSuprimentos,
  getDashboardSeguranca,
} from "./data/dashboard";

export {
  DEMO_REQUISICOES,
  DEMO_ORDENS_COMPRA,
  DEMO_CATEGORIAS,
} from "./data/suprimentos";

export {
  DEMO_OCORRENCIAS,
  DEMO_PENDENCIAS,
  DEMO_CHECKLIST,
  DEMO_TREINAMENTOS,
  DEMO_BANCO_TALENTOS,
} from "./data/ocorrencias";

export { DEMO_USERS } from "./data/usuarios";
