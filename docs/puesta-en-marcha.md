# Puesta en marcha con usuarios reales (Supabase)

La plataforma sigue siendo un sitio estático (GitHub Pages), pero los usuarios, el avance y
las notas viven ahora en **Supabase**: PostgreSQL + autenticación, gratis hasta ~50 000
usuarios activos al mes. Es la opción «C» del documento de arquitectura: no hay servidor
propio que mantener, y si la Gobernación decide migrar a Django + PostgreSQL, el esquema
de `supabase/esquema.sql` se lleva casi tal cual.

Tiempo estimado: 20 minutos.

---

## 1. Crear el proyecto

1. Entrar a <https://supabase.com>, crear una cuenta (idealmente con un correo institucional
   que no dependa de una sola persona) y pulsar **New project**.
2. Nombre `curso-ctei-casanare`, región **South America (São Paulo)**, y una contraseña de
   base de datos larga. Guardarla en un gestor de contraseñas.

## 2. Crear las tablas y las reglas de seguridad

1. **SQL Editor → New query**, pegar todo `supabase/esquema.sql` y pulsar **Run**.
2. Nueva consulta con el archivo **`claves.sql`** (respuestas correctas de las evaluaciones;
   se entrega aparte y **no** se sube al repositorio público) y **Run**.
   Las claves se pueden corregir después en **Table Editor → claves**.

## 3. Configurar la autenticación

En **Authentication**:

| Dónde | Qué poner |
|---|---|
| Sign In / Providers → Email | **Confirm email: activado** (verifica que el correo existe) |
| Sign In / Providers → Email | **Secure password change: activado** |
| Policies / Passwords | Longitud mínima **10**; requisitos: letras y números; **Prevent leaked passwords** si el plan lo permite |
| URL Configuration → Site URL | `https://USUARIO.github.io/curso-ctei-casanare/` |
| URL Configuration → Redirect URLs | `https://USUARIO.github.io/curso-ctei-casanare/**` y, para pruebas locales, `http://localhost:8000/**` |
| Rate Limits | Se dejan los valores por defecto (limitan intentos de ingreso y correos) |
| Emails → SMTP Settings | Opcional pero recomendado: el correo por defecto de Supabase envía pocos mensajes por hora. Para la cohorte real, configurar un SMTP institucional o de un servicio como Brevo/Resend |

## 4. Conectar el sitio

En **Project Settings → API** copiar **Project URL** y la clave **anon / publishable** y
pegarlas en `js/config.js`:

```js
export const SUPABASE_URL = 'https://xxxxxxxx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJ...';
```

La clave *anon* es pública por diseño (viaja en cada página); los datos los protegen las
políticas RLS. **Nunca** pegar la clave `service_role` en el sitio ni en el repositorio.

Subir el cambio (`git commit` + `git push`) y esperar a que GitHub Pages lo publique.

## 5. Crear las cuentas reales

**Participante:** inscribirse desde la página de ingreso (pestaña *Inscribirme*), aceptar
la autorización de datos y confirmar el correo con el enlace recibido.

**Coordinación (admin):**

1. La persona se inscribe igual que un participante y confirma su correo.
2. En **SQL Editor**, abrir `supabase/crear-admin.sql`, cambiar el correo y ejecutar.
3. La persona cierra sesión y vuelve a entrar: aparece **Seguimiento del curso** en su menú.

Nadie puede darse el rol de coordinación desde el navegador.

## 6. Verificar

- [ ] Inscribirse con un correo de prueba → llega el correo de confirmación.
- [ ] Ingresar con contraseña equivocada → «El correo o la contraseña no coinciden».
- [ ] *¿Olvidó su contraseña?* → llega el enlace y permite fijar una nueva.
- [ ] Como participante: abrir las 7 secciones de un módulo, presentar la evaluación y ver
      el resultado con la retroalimentación.
- [ ] Como participante, abrir `paginas/admin.html` → redirige al inicio.
- [ ] Como admin: el panel de seguimiento muestra a los participantes reales.
- [ ] Desde otro computador, ingresar con la misma cuenta → se ven el mismo avance y notas.

---

## Qué protege cada medida

| Riesgo | Medida |
|---|---|
| Robo de contraseñas | Supabase Auth guarda solo el hash (bcrypt). La plataforma nunca ve ni guarda contraseñas |
| Contraseñas débiles | Mínimo 10 caracteres con letras y números (en la página y en Supabase) |
| Ataques de fuerza bruta | Límites de intentos de Supabase Auth; mensajes de error que no revelan si un correo está inscrito |
| Un participante lee datos de otro | Row Level Security en todas las tablas: cada quien lee solo lo suyo |
| Un participante se vuelve admin | El perfil lo crea un disparador del servidor con rol `participante`; la columna `rol` no es editable desde la API |
| Filtración del banco de respuestas | Las respuestas correctas están en la tabla `claves`, legible solo por la coordinación; los JSON públicos ya no las incluyen |
| Notas falsificadas | La nota la calcula el servidor (`presentar_evaluacion`); el navegador no puede insertar intentos |
| Envíos automatizados de evaluaciones | Un intento cada 10 segundos por persona, y solo tras consultar las 7 secciones |
| Inyección de código (XSS) | Todo texto se escapa con `esc()`; política CSP que solo permite scripts propios y de cdnjs |
| Fuga de la URL a terceros | `Referrer-Policy: strict-origin-when-cross-origin` |
| Ley 1581 de 2012 | Autorización explícita al inscribirse (queda la fecha en `perfiles.acepto_datos`) y página de política de datos |
| Dependencia de un CDN para la autenticación | La librería de Supabase está copiada en `js/vendor/supabase.js` (v2.117.2) |

## Mantenimiento

- **Copias de seguridad:** el plan gratuito no incluye respaldos descargables. Exportar
  periódicamente desde **Database → Backups** (plan Pro) o con `pg_dump` usando la cadena
  de conexión del proyecto.
- **Proyecto pausado:** en el plan gratuito, Supabase pausa el proyecto tras 7 días sin
  uso. Se reactiva desde el panel; durante el curso la actividad normal lo mantiene activo.
- **Borrar un participante** (derecho de supresión): **Authentication → Users → Delete
  user**. Su perfil, avance e intentos se borran en cascada.
- **Advisors:** revisar **Advisors → Security** en el panel de Supabase de vez en cuando.
