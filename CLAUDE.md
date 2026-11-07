# CLAUDE.md — Plataforma LMS del curso CTeI Casanare

Aula virtual del curso MOOC «Innovación pública y formulación de proyectos CTeI para el
fortalecimiento de capacidades territoriales en Casanare» (Gobernación de Casanare, Planeación,
equipo CTeI). Práctica profesional de Unitrópico. **Todo el proyecto está en español: código,
comentarios, commits y conversación.**

Contexto completo, historial de decisiones y pendientes: [`docs/contexto-para-claude.md`](docs/contexto-para-claude.md).

## Cómo está armado

- **Frontend estático** (HTML + CSS + JavaScript en módulos ES, sin framework ni compilación),
  publicado en GitHub Pages desde `main`: https://drackzero.github.io/curso-ctei-casanare/
- **Backend: Supabase** (proyecto `csfcugfczltvwqmgwnro`): Auth, PostgreSQL con RLS, Storage.
- `js/datos/almacen.js` es el **único** archivo que habla con Supabase. Las vistas leen una caché
  síncrona que se llena en `almacen.iniciar()`.
- `js/datos/contenidos.js` lee el contenido de la tabla `contenido` y, si no hay fila, de
  `contenido/*.json`. Una versión guardada desde el editor **tapa** al JSON del repositorio.
- `js/config.js`: URL y clave *publishable* de Supabase (pública por diseño), y `PAGINAS`.
- `supabase/esquema.sql`: tablas, políticas RLS, funciones y bucket. **Idempotente**: se vuelve
  a ejecutar completo en el SQL Editor de Supabase después de cada cambio. Nunca se aplica solo.
- Librerías copiadas en `js/vendor/` (supabase-js 2.117.2, qrcode-generator 1.4.4). CSP en cada
  HTML: solo scripts propios y de cdnjs; no usar scripts en línea.

## Reglas que no se rompen

1. **Las respuestas correctas nunca van al repositorio** (es público). Viven en la tabla
   `claves`; los JSON de `contenido/preguntas/` no llevan `correcta` ni `retroalimentacion`.
   Los SQL con respuestas se entregan al usuario como archivo aparte, marcados CONFIDENCIAL.
2. La seguridad está en el servidor (RLS + funciones), no en la interfaz.
3. La calificación la hace `presentar_evaluacion()` en el servidor. El cliente envía una
   posición por pregunta del banco: índice elegido o `-1` si no salió en ese intento.
4. Nunca poner en el sitio ni en el repo la clave `sb_secret_…` / `service_role`.
5. El rol `admin` solo se asigna por SQL (`supabase/crear-admin.sql`).

## Flujo de trabajo

- Probar sin Supabase real: el entorno de nube no llega a `*.supabase.co`. Se usa PostgreSQL
  local con un esquema `auth`/`storage` simulado para probar `esquema.sql` y las políticas, y
  Playwright (Chromium en `/opt/pw-browsers/chromium`) con las peticiones a Supabase
  interceptadas para probar las pantallas.
- Comprobar sintaxis: `node --input-type=module --check < archivo.js`.
- Servir local: `python3 -m http.server 8000`.
- Publicar: commit en la rama de trabajo y push también a `main` (GitHub Pages publica `main`).
- Después de cambiar `esquema.sql`, decirle al usuario que lo ejecute en Supabase.

## Estilo del código

- Comentarios breves en español que explican el porqué. Nombres en español (`pintar`,
  `conectar`, `almacen`, `contenidos`).
- Las vistas arman HTML con plantillas de texto y escapan todo texto con `esc()`.
- Colores y tipografía en variables de `css/base.css` (verde institucional `--gob: #0B5D3B`;
  Montserrat para títulos, Work Sans para texto).
