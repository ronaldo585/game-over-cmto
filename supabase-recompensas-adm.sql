-- ============================================================
-- GAME OVER CMTO | Recompensas seguras da Central do ADM
-- Execute uma vez no SQL Editor do Supabase.
-- Professores cadastrados e perfis de administração existentes
-- passam a ter permissão para usar as duas funções abaixo.
-- ============================================================

begin;

create table if not exists public.administradores_game_over (
    email text primary key,
    usuario_id uuid,
    criado_em timestamptz not null default now()
);

alter table public.administradores_game_over
add column if not exists usuario_id uuid;

alter table public.administradores_game_over enable row level security;

-- Professores são administradores do projeto. Os nomes abaixo mantêm
-- compatibilidade com a conta ADM que já existia no painel do aluno.
insert into public.administradores_game_over (email)
select distinct lower(trim(email))
from public.professores
where email is not null and trim(email) <> ''
on conflict (email) do nothing;

-- Vincula o cadastro ADM ao ID real do Supabase Auth. Assim a permissão
-- continua funcionando mesmo quando o token não expõe o e-mail da conta.
update public.administradores_game_over as administrador
set usuario_id = usuario.id
from auth.users as usuario
where administrador.usuario_id is null
  and lower(usuario.email) = administrador.email;

insert into public.administradores_game_over (email)
select distinct lower(trim(email))
from public.alunos
where email is not null
  and trim(email) <> ''
  and (
      lower(trim(coalesce(nome, ''))) in ('adm', 'admin', 'administrador')
      or lower(coalesce(nome, '')) like '%mestre dos games%'
  )
on conflict (email) do nothing;

create table if not exists public.recompensas_adm_game_over (
    id bigint generated always as identity primary key,
    tipo text not null check (tipo in ('moedas_turma', 'criatura_epica')),
    executado_por_email text not null,
    aluno_id text,
    detalhes jsonb not null default '{}'::jsonb,
    criado_em timestamptz not null default now()
);

alter table public.recompensas_adm_game_over enable row level security;

create or replace function public.eh_administrador_game_over()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.administradores_game_over
        where usuario_id = auth.uid()
           or email = lower(coalesce(auth.jwt() ->> 'email', ''))
    );
$$;

drop function if exists public.adm_dar_moedas_turma();

create or replace function public.adm_dar_moedas_turma(p_quantidade integer default 1000)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    quantidade_alunos integer;
    email_adm text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
    if not public.eh_administrador_game_over() then
        raise exception 'Esta conta não possui permissão de ADM.' using errcode = '42501';
    end if;

    if p_quantidade not in (500, 1000, 2000) then
        raise exception 'Quantidade de moedas inválida para o evento.';
    end if;

    update public.alunos
    set moedas = coalesce(moedas, 0) + p_quantidade;

    get diagnostics quantidade_alunos = row_count;

    insert into public.recompensas_adm_game_over (tipo, executado_por_email, detalhes)
    values (
        'moedas_turma',
        email_adm,
        jsonb_build_object('moedas_por_aluno', p_quantidade, 'alunos_premiados', quantidade_alunos)
    );

    return jsonb_build_object(
        'alunos_premiados', quantidade_alunos,
        'moedas_por_aluno', p_quantidade
    );
end;
$$;

drop function if exists public.adm_sortear_criatura_epica();

create or replace function public.adm_sortear_criatura_epica(p_chave text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    vencedor record;
    criatura_existente record;
    chave_epica text;
    nome_epico text;
    elemento_epico text;
    email_adm text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
    if not public.eh_administrador_game_over() then
        raise exception 'Esta conta não possui permissão de ADM.' using errcode = '42501';
    end if;

    select id, nome
    into vencedor
    from public.alunos
    order by random()
    limit 1;

    if not found then
        raise exception 'Não existe aluno cadastrado para o sorteio.';
    end if;

    if p_chave is not null and p_chave not in ('nimbara', 'cristalume') then
        raise exception 'Criatura épica inválida para o evento.';
    end if;

    if p_chave = 'nimbara' or (p_chave is null and random() < 0.5) then
        chave_epica := 'nimbara';
        nome_epico := 'Nimbara';
        elemento_epico := 'NÉVOA';
    else
        chave_epica := 'cristalume';
        nome_epico := 'Cristalume';
        elemento_epico := 'CRISTAL';
    end if;

    select id, capturas, nivel
    into criatura_existente
    from public.rpg_criaturas_aluno
    where aluno_id = vencedor.id::text
      and chave = chave_epica
    limit 1;

    if found then
        update public.rpg_criaturas_aluno
        set capturas = coalesce(criatura_existente.capturas, 1) + 1,
            nivel = greatest(coalesce(criatura_existente.nivel, 1), 1)
        where id = criatura_existente.id;
    else
        insert into public.rpg_criaturas_aluno (
            aluno_id, chave, nome, elemento, nivel, capturas
        ) values (
            vencedor.id::text, chave_epica, nome_epico, elemento_epico, 1, 1
        );
    end if;

    insert into public.recompensas_adm_game_over (
        tipo, executado_por_email, aluno_id, detalhes
    ) values (
        'criatura_epica',
        email_adm,
        vencedor.id::text,
        jsonb_build_object(
            'ganhador_nome', vencedor.nome,
            'criatura_chave', chave_epica,
            'criatura_nome', nome_epico
        )
    );

    return jsonb_build_object(
        'ganhador_id', vencedor.id::text,
        'ganhador_nome', vencedor.nome,
        'criatura_chave', chave_epica,
        'criatura_nome', nome_epico
    );
end;
$$;

revoke all on table public.administradores_game_over from anon, authenticated;
revoke all on table public.recompensas_adm_game_over from anon, authenticated;
revoke all on function public.eh_administrador_game_over() from public;
revoke all on function public.adm_dar_moedas_turma(integer) from public;
revoke all on function public.adm_sortear_criatura_epica(text) from public;
grant execute on function public.eh_administrador_game_over() to authenticated;
grant execute on function public.adm_dar_moedas_turma(integer) to authenticated;
grant execute on function public.adm_sortear_criatura_epica(text) to authenticated;

notify pgrst, 'reload schema';

commit;
