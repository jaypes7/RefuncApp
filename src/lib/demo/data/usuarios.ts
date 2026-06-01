export interface DemoUser {
  id: string;
  re: string;
  nome: string;
  perfil: "admin" | "user" | "guest";
  centro_custo: string[];
  autorizado_em: string;
  precisa_redefinir_senha: boolean;
}

export const DEMO_USERS: DemoUser[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    re: "admin@demo.com",
    nome: "Administrador Demo",
    perfil: "admin",
    centro_custo: ["DEMO-001"],
    autorizado_em: "2026-01-01T00:00:00Z",
    precisa_redefinir_senha: false,
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    re: "coordenador@demo.com",
    nome: "Coordenador de Campo Demo",
    perfil: "user",
    centro_custo: ["DEMO-001"],
    autorizado_em: "2026-01-01T00:00:00Z",
    precisa_redefinir_senha: false,
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    re: "rh@demo.com",
    nome: "Analista de RH Demo",
    perfil: "user",
    centro_custo: ["DEMO-001"],
    autorizado_em: "2026-01-01T00:00:00Z",
    precisa_redefinir_senha: false,
  },
];

export function findDemoUserByRe(re: string): DemoUser | undefined {
  return DEMO_USERS.find((u) => u.re.toLowerCase() === re.toLowerCase());
}

/**
 * Valida credenciais demo comparando a senha diretamente com
 * DEFAULT_USER_PASSWORD (env var). Sem bcrypt — é um sandbox público,
 * a senha demo não protege dados reais.
 */
export function validateDemoCredentials(
  re: string,
  senha: string,
): DemoUser | null {
  const user = findDemoUserByRe(re);
  if (!user) return null;

  const senhaCorreta = process.env.DEFAULT_USER_PASSWORD ?? "demo123";
  return senha === senhaCorreta ? user : null;
}
