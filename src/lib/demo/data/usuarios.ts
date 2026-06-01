import bcrypt from "bcryptjs";

export interface DemoUser {
  id: string;
  re: string;
  nome: string;
  perfil: "admin" | "user" | "guest";
  centro_custo: string[];
  senha_hash: string;
  autorizado_em: string;
  precisa_redefinir_senha: boolean;
}

// Hashes pré-gerados para "demo123" com salt rounds=10
// Gerado uma única vez para evitar bcrypt em tempo de build
const HASH_DEMO123 = "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi";

export const DEMO_USERS: DemoUser[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    re: "admin@demo.com",
    nome: "Administrador Demo",
    perfil: "admin",
    centro_custo: ["DEMO-001"],
    senha_hash: HASH_DEMO123,
    autorizado_em: "2026-01-01T00:00:00Z",
    precisa_redefinir_senha: false,
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    re: "coordenador@demo.com",
    nome: "Coordenador de Campo Demo",
    perfil: "user",
    centro_custo: ["DEMO-001"],
    senha_hash: HASH_DEMO123,
    autorizado_em: "2026-01-01T00:00:00Z",
    precisa_redefinir_senha: false,
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    re: "rh@demo.com",
    nome: "Analista de RH Demo",
    perfil: "user",
    centro_custo: ["DEMO-001"],
    senha_hash: HASH_DEMO123,
    autorizado_em: "2026-01-01T00:00:00Z",
    precisa_redefinir_senha: false,
  },
];

export function findDemoUserByRe(re: string): DemoUser | undefined {
  return DEMO_USERS.find((u) => u.re.toLowerCase() === re.toLowerCase());
}

export async function validateDemoCredentials(
  re: string,
  senha: string,
): Promise<DemoUser | null> {
  const user = findDemoUserByRe(re);
  if (!user) return null;
  const valid = await bcrypt.compare(senha, user.senha_hash);
  return valid ? user : null;
}
