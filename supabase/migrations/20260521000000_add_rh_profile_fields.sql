alter table public.colaboradores
  add column if not exists escolaridade text,
  add column if not exists experiencia_funcao text;
