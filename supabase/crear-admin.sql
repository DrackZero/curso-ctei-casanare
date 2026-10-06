-- Convierte una cuenta YA INSCRITA en coordinación (rol admin).
-- 1. La persona se inscribe normalmente desde la plataforma (y confirma su correo).
-- 2. Cambie el correo de abajo y ejecute este archivo en Supabase → SQL Editor.
-- Es la única forma de dar el rol admin: desde el navegador no es posible.

update public.perfiles
   set rol = 'admin'
 where correo = lower('CORREO-DE-LA-COORDINACION@ejemplo.gov.co')
returning id, nombre, correo, rol;

-- Para quitar el rol:  update public.perfiles set rol = 'participante' where correo = '...';
-- Para ver quién es admin:  select nombre, correo from public.perfiles where rol = 'admin';
