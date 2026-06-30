-- Tabela closed_days - Registro de dias fechados para bloqueio de sincronização
-- Sem RLS, com realtime habilitado

create table if not exists public.closed_days (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  closed_at timestamptz not null default now(),
  closed_by text,
  created_at timestamptz not null default now()
);

-- Habilitar realtime (ignorar erro se já estiver na publicação)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' 
    and schemaname = 'public' 
    and tablename = 'closed_days'
  ) then
    alter publication supabase_realtime add table public.closed_days;
  end if;
end $$;

-- Índice para performance
create index if not exists idx_closed_days_date on public.closed_days(date);
