# Contexto para continuar el proyecto (traspaso)

Documento para que otra persona u otra sesión de Claude retome el trabajo sin perder lo decidido.
Estado al 7 de noviembre de 2026.

## 1. Situación actual

- La plataforma está **publicada y funcional**, en etapa de piloto:
  https://drackzero.github.io/curso-ctei-casanare/
- Repositorio: https://github.com/DrackZero/curso-ctei-casanare (rama `main` = lo publicado;
  rama de trabajo `claude/security-users-setup-pc6per`, igual a `main`).
- Backend: Supabase, proyecto `csfcugfczltvwqmgwnro`, plan gratuito.
- **Bloqueo actual:** la ingeniera responsable del equipo CTeI no ha tenido tiempo de validar el
  banco de preguntas ni las guías de estudio. Por eso no se ha hecho la prueba con usuarios reales.
- Personas: el practicante es Johan Esteban Martínez Jaimes (Unitrópico). Cuenta de coordinación
  de prueba: `johanmartinez.es@unitropico.edu.co`.

## 2. Qué se construyó (en orden)

| Fecha | Cambio |
| --- | --- |
| 6 oct. | Migración del prototipo (localStorage, contraseñas en texto plano) a Supabase: Auth, RLS, calificación en el servidor, CSP, Ley 1581, recuperación de contraseña |
| 6 oct. | Validaciones de formularios (mostrar contraseña, repetirla, requisitos en vivo, sugerencia de correo), ajustes visuales del ingreso, reparación de cuentas sin perfil |
| 13 oct. | Modo prueba: la coordinación presenta evaluaciones sin que se guarden |
| 14 oct. | Editor de contenidos (preguntas, módulos, materiales, historial) y Supabase Storage |
| 16 oct. | Pantalla de carga |
| 20 oct. | Fichas nuevas (6 de presentación + 8 temáticas, WebP) y banco v2: 10 preguntas por módulo, 8 al azar por intento |
| 21 oct. | Visor de fichas con una sola barra de desplazamiento; `es_admin()` movida al esquema `privado`; `guardar_preguntas()` como SECURITY INVOKER |
| 27 oct. | Constancia de finalización con código y QR, página pública de verificación, y 6 guías de estudio en PDF (borradores) |

## 3. Decisiones tomadas y por qué

- **Supabase en lugar de Django** (el informe de inicio proponía Django + DRF): no hay servidor
  que mantener ni pagar en el piloto; el esquema es SQL estándar y se puede migrar.
- **Sin framework** (se había propuesto React): reutiliza la interfaz validada por la entidad y
  se publica en GitHub Pages sin compilar.
- **Repositorio público** (GitHub Pages gratis lo exige): por eso las respuestas nunca se suben y
  el historial de Git se reinició al subir el proyecto, porque el commit original las contenía.
- **Rol como texto con CHECK, no booleano**: está previsto un tercer rol, «tutor».
- **8 de 10 preguntas al azar**: reduce memorizar respuestas entre intentos. Tras calificar solo
  se revelan las respuestas de las preguntas que salieron.
- **Correo:** Resend no sirvió porque exige un dominio propio y solo hay `github.io`. Se usa SMTP
  de Gmail con contraseña de aplicación. Pendiente: correo o dominio institucional.
- **Avisos del Security Advisor de Supabase:** `presentar_evaluacion` queda como SECURITY DEFINER
  a propósito (debe leer respuestas que el participante no ve; verifica todo por dentro).
  «Leaked Password Protection» solo existe en el plan Pro; se compensa con contraseña mínima de
  10 caracteres con letras y números.

## 4. Datos y archivos confidenciales

| Qué | Dónde está |
| --- | --- |
| Respuestas correctas y retroalimentación | Supabase, tabla `claves` |
| `banco-preguntas-v2-CONFIDENCIAL.sql` | Lo tiene el usuario (se le envió el 20 oct.). No está en el repo |
| `claves-CONFIDENCIAL.sql` (banco v1, ya reemplazado) | Lo tiene el usuario; obsoleto |
| Informe técnico de avance (.docx) | Lo tiene el usuario (enviado el 20 oct.) |
| Clave *secret* de Supabase | Solo en el panel de Supabase. Nunca en el repo ni en un chat |

Para exportar las respuestas desde Supabase si se pierde el archivo (SQL Editor → Run → Export):

```sql
select modulo_id, orden, correcta, retroalimentacion from public.claves order by modulo_id, orden;
```

## 5. Cómo trabaja el usuario con Supabase

- Todo cambio de base de datos se hace en `supabase/esquema.sql`; el usuario lo copia completo en
  **Supabase → SQL Editor → Run**. Es idempotente: se puede ejecutar varias veces.
- Crear cuentas siempre desde la plataforma (no desde el panel). Si una cuenta quedó sin perfil,
  volver a ejecutar el esquema la repara.
- Dar el rol de coordinación: `supabase/crear-admin.sql` con el correo.
- Configuración ya hecha: confirmación de correo activada, SMTP de Gmail, URL del sitio y
  Redirect URLs `https://drackzero.github.io/curso-ctei-casanare/**`.

## 6. Cómo probar sin el Supabase real

El entorno en la nube no alcanza `*.supabase.co`. Lo que se hizo:

- **Base de datos:** PostgreSQL local con un esquema `auth` simulado (`auth.users`, `auth.uid()`
  leyendo `current_setting('test.uid')`), roles `anon` y `authenticated`, y un esquema `storage`
  mínimo. Sobre eso se ejecuta `esquema.sql` y se prueban las políticas con `set role`.
- **Pantallas:** Playwright con Chromium en `/opt/pw-browsers/chromium`; se interceptan las
  peticiones a `*.supabase.co` y se responde con datos simulados. Se inyecta una sesión falsa en
  `localStorage` con la clave `sb-csfcugfczltvwqmgwnro-auth-token`. Ojo: `maybeSingle()` de
  supabase-js pide un arreglo y filtra del lado del cliente, así que el simulador debe filtrar por
  `id=eq.…`.
- Las fuentes de Google están bloqueadas en ese entorno; para capturas fieles se sirven desde
  `@fontsource/*` (npm).

## 7. Pendientes

**De la entidad**
- Validar el banco de preguntas (60, todas «por validar») y las 6 guías de estudio (borradores).
- Decidir quién firma la constancia y si debe llevar el número de documento (hoy no se pide al
  inscribirse).
- Definir la administración institucional: pasar GitHub, Supabase y el correo a cuentas de la
  entidad para no depender del practicante.
- Dominio o correo institucional.

**Técnicos (propuestos, no hechos)**
- Recordatorios por correo a quien no avanza o reprobó.
- Encuesta de satisfacción corta al final de cada módulo.
- Aplicación instalable en el celular (PWA) con las fichas disponibles sin conexión.
- Botón «Continuar donde quedó» y tiempo estimado por módulo.
- Gestión de usuarios y roles desde el panel, sin entrar a Supabase.
- Filtros del seguimiento por entidad o municipio.
- Respaldo descargable de toda la información (el plan gratuito no guarda copias).
- Guía de prueba de una página para el piloto con compañeros de oficina.

**Riesgos del plan gratuito**
- Supabase pausa el proyecto tras 7 días sin uso (se reactiva desde el panel con «Restore»).
- 1 GB de archivos y unos 5 GB de descarga al mes.

## 8. Preferencias del usuario

- Escribe en español informal; espera respuestas en español claro y sin tecnicismos innecesarios.
- Prefiere que se hagan los cambios directamente y se publiquen en `main`, con pruebas antes.
- Valora mucho que la interfaz no «salte» ni se vea desprolija (barras dobles, desplazamientos).
- Antes de borrar datos o cambiar algo grande en Supabase, explicarle qué hace y en qué orden.
