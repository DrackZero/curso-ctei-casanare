-- Esquema de la plataforma del curso CTeI Casanare en Supabase (PostgreSQL).
-- Se ejecuta una sola vez en: Supabase → SQL Editor → New query → pegar → Run.
-- Es idempotente: puede volver a ejecutarse sin perder datos.
--
-- Principios de seguridad:
--   * Las contraseñas las gestiona Supabase Auth (hash bcrypt); esta base nunca las ve.
--   * Row Level Security (RLS) activa en todas las tablas: cada participante solo lee
--     lo suyo; la coordinación (rol 'admin') lee todo.
--   * Nadie puede darse el rol 'admin' desde el navegador: el perfil se crea con un
--     disparador del servidor y la columna 'rol' no admite UPDATE desde la API.
--   * Las respuestas correctas viven en la tabla 'claves', que solo lee la coordinación.
--     La calificación ocurre en el servidor (función presentar_evaluacion).

-- ------------------------------------------------------------------ perfiles
create table if not exists public.perfiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  nombre       text not null check (char_length(nombre) between 3 and 120),
  correo       text not null,
  entidad      text not null default '' check (char_length(entidad) <= 160),
  rol          text not null default 'participante' check (rol in ('participante', 'admin')),
  acepto_datos timestamptz,               -- autorización de tratamiento de datos (Ley 1581 de 2012)
  creado       timestamptz not null default now()
);

alter table public.perfiles enable row level security;

-- ¿El usuario de la petición es coordinación? SECURITY DEFINER evita recursión en RLS.
create or replace function public.es_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol = 'admin');
$$;

-- Crea el perfil al registrarse. El rol se fija aquí, nunca desde el cliente.
create or replace function public.crear_perfil()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre, correo, entidad, acepto_datos)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data->>'nombre'), ''), split_part(new.email, '@', 1)), 120),
    lower(new.email),
    left(coalesce(trim(new.raw_user_meta_data->>'entidad'), ''), 160),
    case when (new.raw_user_meta_data->>'acepto_datos') = 'true' then now() end
  );
  return new;
end;
$$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();

drop policy if exists perfiles_leer on public.perfiles;
create policy perfiles_leer on public.perfiles
  for select to authenticated
  using (id = auth.uid() or public.es_admin());

drop policy if exists perfiles_editar_propio on public.perfiles;
create policy perfiles_editar_propio on public.perfiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Solo nombre y entidad son editables por su dueño. Ni rol ni correo.
revoke all on public.perfiles from anon, authenticated;
grant select on public.perfiles to authenticated;
grant update (nombre, entidad) on public.perfiles to authenticated;

-- ------------------------------------------------------------------ progreso
create table if not exists public.progreso (
  usuario_id uuid not null default auth.uid() references public.perfiles(id) on delete cascade,
  modulo_id  text not null check (modulo_id ~ '^m[0-9]{1,2}$'),
  seccion    text not null check (seccion ~ '^[a-z]{1,30}$'),
  visto_en   timestamptz not null default now(),
  primary key (usuario_id, modulo_id, seccion)
);

alter table public.progreso enable row level security;

drop policy if exists progreso_leer on public.progreso;
create policy progreso_leer on public.progreso
  for select to authenticated
  using (usuario_id = auth.uid() or public.es_admin());

drop policy if exists progreso_marcar on public.progreso;
create policy progreso_marcar on public.progreso
  for insert to authenticated
  with check (usuario_id = auth.uid());

drop policy if exists progreso_desmarcar on public.progreso;
create policy progreso_desmarcar on public.progreso
  for delete to authenticated
  using (usuario_id = auth.uid());

revoke all on public.progreso from anon, authenticated;
grant select, insert, delete on public.progreso to authenticated;

-- ------------------------------------------------------------------ claves (respuestas correctas)
create table if not exists public.claves (
  modulo_id         text not null,
  orden             int  not null,          -- posición de la pregunta en contenido/preguntas/mX.json (0, 1, 2…)
  correcta          int  not null check (correcta >= 0),
  retroalimentacion text not null default '',
  primary key (modulo_id, orden)
);

alter table public.claves enable row level security;

drop policy if exists claves_leer_admin on public.claves;
create policy claves_leer_admin on public.claves
  for select to authenticated
  using (public.es_admin());

revoke all on public.claves from anon, authenticated;
grant select on public.claves to authenticated;

-- ------------------------------------------------------------------ intentos
create table if not exists public.intentos (
  id         uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  modulo_id  text not null,
  nota       int  not null check (nota between 0 and 100),
  correctas  int  not null,
  total      int  not null,
  respuestas int[] not null,
  fecha      timestamptz not null default now()
);
create index if not exists intentos_usuario_modulo on public.intentos (usuario_id, modulo_id);

alter table public.intentos enable row level security;

drop policy if exists intentos_leer on public.intentos;
create policy intentos_leer on public.intentos
  for select to authenticated
  using (usuario_id = auth.uid() or public.es_admin());

-- Sin políticas de INSERT/UPDATE/DELETE: los intentos solo se crean con presentar_evaluacion().
revoke all on public.intentos from anon, authenticated;
grant select on public.intentos to authenticated;

-- ------------------------------------------------------------------ calificación en el servidor
create or replace function public.presentar_evaluacion(p_modulo text, p_respuestas int[])
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid       uuid := auth.uid();
  v_claves    int[];
  v_retro     text[];
  v_total     int;
  v_correctas int := 0;
  v_nota      int;
  v_id        uuid;
  i           int;
begin
  if v_uid is null then
    raise exception 'Sesión requerida' using errcode = '42501';
  end if;

  -- Freno básico contra envíos automatizados: un intento cada 10 segundos.
  if exists (select 1 from public.intentos
             where usuario_id = v_uid and fecha > now() - interval '10 seconds') then
    raise exception 'Espere unos segundos antes de volver a enviar la evaluación' using errcode = 'P0001';
  end if;

  -- Regla del curso: la evaluación se habilita al consultar las 7 secciones del módulo.
  if (select count(*) from public.progreso where usuario_id = v_uid and modulo_id = p_modulo) < 7 then
    raise exception 'Consulte las siete secciones del módulo antes de presentar la evaluación' using errcode = 'P0001';
  end if;

  select array_agg(correcta order by orden), array_agg(retroalimentacion order by orden)
    into v_claves, v_retro
    from public.claves where modulo_id = p_modulo;

  v_total := coalesce(array_length(v_claves, 1), 0);
  if v_total = 0 then
    raise exception 'El módulo no tiene evaluación configurada' using errcode = 'P0001';
  end if;
  if coalesce(array_length(p_respuestas, 1), 0) <> v_total then
    raise exception 'Debe responder las % preguntas', v_total using errcode = 'P0001';
  end if;

  for i in 1..v_total loop
    if p_respuestas[i] = v_claves[i] then v_correctas := v_correctas + 1; end if;
  end loop;
  v_nota := round(v_correctas::numeric / v_total * 100);

  insert into public.intentos (usuario_id, modulo_id, nota, correctas, total, respuestas)
  values (v_uid, p_modulo, v_nota, v_correctas, v_total, p_respuestas)
  returning id into v_id;

  -- Solo después de calificar se revelan las respuestas correctas y la retroalimentación.
  return jsonb_build_object(
    'id', v_id, 'nota', v_nota, 'correctas', v_correctas, 'total', v_total,
    'respuestas', to_jsonb(p_respuestas),
    'claves', to_jsonb(v_claves), 'retroalimentacion', to_jsonb(v_retro)
  );
end;
$$;

revoke all on function public.presentar_evaluacion(text, int[]) from public, anon;
grant execute on function public.presentar_evaluacion(text, int[]) to authenticated;
revoke all on function public.crear_perfil() from public, anon, authenticated;
