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
-- Vive en el esquema «privado», que la API de Supabase no publica: las políticas la usan
-- por dentro, pero nadie puede llamarla desde internet (/rest/v1/rpc).
create schema if not exists privado;
revoke all on schema privado from public, anon;
grant usage on schema privado to authenticated;

create or replace function privado.es_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol = 'admin');
$$;

revoke all on function privado.es_admin() from public, anon;
grant execute on function privado.es_admin() to authenticated;

-- Crea el perfil al registrarse. El rol se fija aquí, nunca desde el cliente.
create or replace function public.crear_perfil()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre, correo, entidad, acepto_datos)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data->>'nombre'), ''), case when char_length(split_part(new.email, '@', 1)) >= 3 then split_part(new.email, '@', 1) else lower(new.email) end), 120),
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

-- Reparación: crea el perfil de cuentas que existan sin él (por ejemplo, creadas desde el
-- panel de Supabase antes de instalar este esquema). Sin perfil, la cuenta no puede ingresar.
insert into public.perfiles (id, nombre, correo)
select u.id, left(coalesce(nullif(trim(u.raw_user_meta_data->>'nombre'), ''), case when char_length(split_part(u.email, '@', 1)) >= 3 then split_part(u.email, '@', 1) else lower(u.email) end), 120), lower(u.email)
  from auth.users u
 where u.email is not null
   and not exists (select 1 from public.perfiles p where p.id = u.id)
on conflict (id) do nothing;

drop policy if exists perfiles_leer on public.perfiles;
create policy perfiles_leer on public.perfiles
  for select to authenticated
  using (id = auth.uid() or privado.es_admin());

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
  using (usuario_id = auth.uid() or privado.es_admin());

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
  using (privado.es_admin());

revoke all on public.claves from anon, authenticated;
-- La coordinación edita las respuestas a través de guardar_preguntas(); nadie más escribe.
drop policy if exists claves_escribir_admin on public.claves;
create policy claves_escribir_admin on public.claves
  for insert to authenticated
  with check (privado.es_admin());
drop policy if exists claves_borrar_admin on public.claves;
create policy claves_borrar_admin on public.claves
  for delete to authenticated
  using (privado.es_admin());

grant select, insert, delete on public.claves to authenticated;

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
  using (usuario_id = auth.uid() or privado.es_admin());

-- Sin políticas de INSERT/UPDATE/DELETE: los intentos solo se crean con presentar_evaluacion().
revoke all on public.intentos from anon, authenticated;
grant select on public.intentos to authenticated;

-- ------------------------------------------------------------------ calificación en el servidor
-- p_respuestas trae una posición por cada pregunta del banco del módulo: el índice de la
-- opción elegida, o -1 si esa pregunta no salió en este intento. Cada intento presenta
-- «preguntasPorIntento» preguntas al azar (dato del documento de preguntas en 'contenido';
-- si no está, se presentan todas).
create or replace function public.presentar_evaluacion(p_modulo text, p_respuestas int[])
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid        uuid := auth.uid();
  v_claves     int[];
  v_retro      text[];
  v_total      int;
  v_por        int;
  v_presentadas int := 0;
  v_correctas  int := 0;
  v_nota       int;
  v_id         uuid;
  v_prueba     boolean := privado.es_admin();   -- la coordinación presenta en modo prueba: no se guarda
  v_ver_claves int[] := '{}';
  v_ver_retro  text[] := '{}';
  i            int;
begin
  if v_uid is null then
    raise exception 'Sesión requerida' using errcode = '42501';
  end if;

  -- Freno básico contra envíos automatizados: un intento cada 10 segundos.
  if not v_prueba and exists (select 1 from public.intentos
             where usuario_id = v_uid and fecha > now() - interval '10 seconds') then
    raise exception 'Espere unos segundos antes de volver a enviar la evaluación' using errcode = 'P0001';
  end if;

  -- Regla del curso: la evaluación se habilita al consultar las 7 secciones del módulo.
  if not v_prueba and (select count(*) from public.progreso where usuario_id = v_uid and modulo_id = p_modulo) < 7 then
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
    raise exception 'La evaluación cambió mientras la presentaba. Recargue la página e inténtelo de nuevo' using errcode = 'P0001';
  end if;

  select (datos->>'preguntasPorIntento')::int into v_por
    from public.contenido where clave = 'preguntas:' || p_modulo;
  v_por := least(v_total, greatest(1, coalesce(v_por, v_total)));

  for i in 1..v_total loop
    if p_respuestas[i] is null or p_respuestas[i] < -1 then
      raise exception 'Respuesta no válida' using errcode = 'P0001';
    end if;
    if p_respuestas[i] >= 0 then
      v_presentadas := v_presentadas + 1;
      if p_respuestas[i] = v_claves[i] then v_correctas := v_correctas + 1; end if;
      v_ver_claves := v_ver_claves || v_claves[i];
      v_ver_retro  := v_ver_retro  || v_retro[i];
    else
      v_ver_claves := v_ver_claves || null::int;   -- no se revela la respuesta de lo que no salió
      v_ver_retro  := v_ver_retro  || null::text;
    end if;
  end loop;

  if v_presentadas <> v_por then
    raise exception 'Debe responder las % preguntas de la evaluación', v_por using errcode = 'P0001';
  end if;
  v_nota := round(v_correctas::numeric / v_presentadas * 100);

  if not v_prueba then
    insert into public.intentos (usuario_id, modulo_id, nota, correctas, total, respuestas)
    values (v_uid, p_modulo, v_nota, v_correctas, v_presentadas, p_respuestas)
    returning id into v_id;
  end if;

  -- Solo después de calificar se revelan las respuestas correctas, y solo de las preguntas presentadas.
  return jsonb_build_object(
    'id', v_id, 'prueba', v_prueba, 'nota', v_nota, 'correctas', v_correctas, 'total', v_presentadas,
    'respuestas', to_jsonb(p_respuestas),
    'claves', to_jsonb(v_ver_claves), 'retroalimentacion', to_jsonb(v_ver_retro)
  );
end;
$$;

revoke all on function public.presentar_evaluacion(text, int[]) from public, anon;

-- Limpieza: intentos que la coordinación haya presentado antes de existir el modo prueba.
delete from public.intentos i using public.perfiles p where p.id = i.usuario_id and p.rol = 'admin';
grant execute on function public.presentar_evaluacion(text, int[]) to authenticated;
revoke all on function public.crear_perfil() from public, anon, authenticated;

-- ================================================================== contenido editable
-- Módulos, catálogo de materiales y preguntas (SIN respuestas correctas) se guardan como
-- documentos JSON, con la misma forma que los archivos de contenido/. Mientras una clave no
-- exista aquí, la plataforma usa el archivo JSON del repositorio.
create table if not exists public.contenido (
  clave           text primary key check (clave ~ '^(curso|modulos|materiales|preguntas:m[0-9]{1,2})$'),
  datos           jsonb not null,
  actualizado     timestamptz not null default now(),
  actualizado_por uuid references public.perfiles(id) on delete set null
);

-- Versiones anteriores: cada cambio guarda lo que había, para poder restaurarlo.
create table if not exists public.contenido_historial (
  id          bigint generated always as identity primary key,
  clave       text not null,
  datos       jsonb not null,
  guardado    timestamptz not null default now(),
  guardado_por uuid references public.perfiles(id) on delete set null
);
create index if not exists contenido_historial_clave on public.contenido_historial (clave, guardado desc);

create or replace function public.contenido_registrar()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' or tg_op = 'DELETE' then
    insert into public.contenido_historial (clave, datos, guardado_por) values (old.clave, old.datos, auth.uid());
  end if;
  if tg_op = 'DELETE' then return old; end if;
  new.actualizado := now();
  new.actualizado_por := auth.uid();
  return new;
end;
$$;

drop trigger if exists contenido_versiones on public.contenido;
create trigger contenido_versiones
  before insert or update or delete on public.contenido
  for each row execute function public.contenido_registrar();

alter table public.contenido enable row level security;
alter table public.contenido_historial enable row level security;

drop policy if exists contenido_leer on public.contenido;
create policy contenido_leer on public.contenido for select to anon, authenticated using (true);
drop policy if exists contenido_crear on public.contenido;
create policy contenido_crear on public.contenido for insert to authenticated with check (privado.es_admin());
drop policy if exists contenido_editar on public.contenido;
create policy contenido_editar on public.contenido for update to authenticated using (privado.es_admin()) with check (privado.es_admin());
drop policy if exists contenido_borrar on public.contenido;
create policy contenido_borrar on public.contenido for delete to authenticated using (privado.es_admin());

drop policy if exists historial_leer on public.contenido_historial;
create policy historial_leer on public.contenido_historial for select to authenticated using (privado.es_admin());

revoke all on public.contenido, public.contenido_historial from anon, authenticated;
grant select on public.contenido to anon, authenticated;
grant insert, update, delete on public.contenido to authenticated;
grant select on public.contenido_historial to authenticated;

-- Guarda el banco de preguntas de un módulo: el texto público va a 'contenido' y las
-- respuestas correctas a 'claves', en una sola operación. Solo la coordinación.
-- SECURITY INVOKER: se ejecuta con los permisos de quien la llama, así que solo funciona
-- para la coordinación, que es la única con permiso de escritura (RLS) en claves y contenido.
create or replace function public.guardar_preguntas(p_modulo text, p_documento jsonb)
returns void
language plpgsql security invoker set search_path = ''
as $$
declare
  v_preguntas jsonb := p_documento->'preguntas';
  v_q         jsonb;
  v_i         int := 0;
  v_n         int;
  v_correcta  int;
begin
  if not privado.es_admin() then
    raise exception 'Solo la coordinación puede editar preguntas' using errcode = '42501';
  end if;
  if p_modulo !~ '^m[0-9]{1,2}$' then
    raise exception 'Módulo no válido' using errcode = 'P0001';
  end if;
  if jsonb_typeof(v_preguntas) <> 'array' or jsonb_array_length(v_preguntas) = 0 then
    raise exception 'El módulo debe tener al menos una pregunta' using errcode = 'P0001';
  end if;

  for v_q in select * from jsonb_array_elements(v_preguntas) loop
    v_i := v_i + 1;
    v_n := coalesce(jsonb_array_length(v_q->'opciones'), 0);
    v_correcta := (v_q->>'correcta')::int;
    if coalesce(trim(v_q->>'enunciado'), '') = '' then
      raise exception 'La pregunta % no tiene enunciado', v_i using errcode = 'P0001';
    end if;
    if v_n < 2 or v_n > 6 then
      raise exception 'La pregunta % debe tener entre 2 y 6 opciones', v_i using errcode = 'P0001';
    end if;
    if v_correcta is null or v_correcta < 0 or v_correcta >= v_n then
      raise exception 'La pregunta % no tiene marcada una respuesta correcta válida', v_i using errcode = 'P0001';
    end if;
  end loop;

  if (p_documento->>'preguntasPorIntento') is not null and
     ((p_documento->>'preguntasPorIntento')::int < 1 or (p_documento->>'preguntasPorIntento')::int > jsonb_array_length(v_preguntas)) then
    raise exception 'Preguntas por intento debe estar entre 1 y %', jsonb_array_length(v_preguntas) using errcode = 'P0001';
  end if;

  delete from public.claves where modulo_id = p_modulo;
  insert into public.claves (modulo_id, orden, correcta, retroalimentacion)
  select p_modulo, (o - 1)::int, (q->>'correcta')::int, coalesce(q->>'retroalimentacion', '')
    from jsonb_array_elements(v_preguntas) with ordinality as t(q, o);

  insert into public.contenido (clave, datos)
  values ('preguntas:' || p_modulo, jsonb_set(p_documento, '{preguntas}',
    (select jsonb_agg(q - 'correcta' - 'retroalimentacion' order by o)
       from jsonb_array_elements(v_preguntas) with ordinality as t(q, o))))
  on conflict (clave) do update set datos = excluded.datos;
end;
$$;

revoke all on function public.guardar_preguntas(text, jsonb) from public, anon;
grant execute on function public.guardar_preguntas(text, jsonb) to authenticated;
revoke all on function public.contenido_registrar() from public, anon, authenticated;

-- ================================================================== archivos (Supabase Storage)
-- Bucket público de lectura: imágenes y PDF del curso. Solo la coordinación sube o borra.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('materiales', 'materiales', true, 20971520,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists materiales_subir on storage.objects;
create policy materiales_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'materiales' and privado.es_admin());
drop policy if exists materiales_reemplazar on storage.objects;
create policy materiales_reemplazar on storage.objects for update to authenticated
  using (bucket_id = 'materiales' and privado.es_admin());
drop policy if exists materiales_borrar on storage.objects;
create policy materiales_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'materiales' and privado.es_admin());

-- Versión anterior de es_admin() en el esquema público: ya ninguna política la usa.
drop function if exists public.es_admin();

-- ================================================================== constancias
-- Se emite una sola vez por participante, cuando aprueba todos los módulos evaluados.
-- El código es aleatorio (no adivinable) y permite verificar la constancia en una página pública.
create table if not exists public.constancias (
  codigo     text primary key,
  usuario_id uuid not null unique references public.perfiles(id) on delete cascade,
  nombre     text not null,          -- nombre tal como quedó impreso
  promedio   int  not null,
  emitida    timestamptz not null default now()
);

alter table public.constancias enable row level security;

drop policy if exists constancias_leer on public.constancias;
create policy constancias_leer on public.constancias
  for select to authenticated
  using (usuario_id = auth.uid() or privado.es_admin());

-- Sin políticas de escritura: solo emitir_constancia() las crea.
revoke all on public.constancias from anon, authenticated;
grant select on public.constancias to authenticated;

create or replace function public.emitir_constancia()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_c        public.constancias;
  v_modulos  int;
  v_aprobados int;
  v_promedio int;
  v_nombre   text;
begin
  if v_uid is null then
    raise exception 'Sesión requerida' using errcode = '42501';
  end if;

  select * into v_c from public.constancias where usuario_id = v_uid;
  if found then
    return to_jsonb(v_c) - 'usuario_id';
  end if;

  -- Módulos con evaluación configurada y mejor nota del participante en cada uno.
  select count(distinct modulo_id) into v_modulos from public.claves;
  select count(*), round(avg(mejor)) into v_aprobados, v_promedio
    from (select modulo_id, max(nota) as mejor from public.intentos
           where usuario_id = v_uid
             and modulo_id in (select distinct modulo_id from public.claves)
           group by modulo_id) m
   where mejor >= 70;

  if v_modulos = 0 or v_aprobados < v_modulos then
    raise exception 'La constancia se habilita al aprobar los % módulos (lleva %)', v_modulos, v_aprobados using errcode = 'P0001';
  end if;

  select nombre into v_nombre from public.perfiles where id = v_uid;

  insert into public.constancias (codigo, usuario_id, nombre, promedio)
  values (upper(substr(md5(gen_random_uuid()::text), 1, 4) || '-' || substr(md5(gen_random_uuid()::text), 1, 4)
                || '-' || substr(md5(gen_random_uuid()::text), 1, 4)),
          v_uid, v_nombre, v_promedio)
  returning * into v_c;

  return to_jsonb(v_c) - 'usuario_id';
end;
$$;

-- Verificación pública: con el código exacto devuelve solo nombre, fecha y promedio.
-- Es la única función de la API que se puede usar sin sesión, y no permite listar constancias.
create or replace function public.verificar_constancia(p_codigo text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('codigo', codigo, 'nombre', nombre, 'promedio', promedio, 'emitida', emitida)
    from public.constancias
   where codigo = upper(trim(p_codigo));
$$;

revoke all on function public.emitir_constancia() from public, anon;
grant execute on function public.emitir_constancia() to authenticated;
revoke all on function public.verificar_constancia(text) from public;
grant execute on function public.verificar_constancia(text) to anon, authenticated;
