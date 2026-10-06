# Plataforma LMS de acceso gratuito — Documento de arquitectura v1

**Autor:** Johan Esteban Martínez Jaimes
**Fecha:** 7 de septiembre de 2026
**Estado:** base técnica previa a la carga de contenidos
**Producto de referencia:** prototipo navegable "Aula Abierta" (demo funcional que acompaña este documento)

---

## 1. Qué es y para quién

Plataforma de formación en línea, de acceso gratuito, organizada en **seis módulos secuenciales**. Cada módulo agrupa lecciones (lectura, video y material descargable en PDF) y cierra con una **evaluación calificada**. Los participantes se registran con una cuenta propia; la plataforma guarda su avance, sus intentos y sus notas.

**Usuarios previstos**

| Rol | Qué hace |
|---|---|
| **Participante** | Se registra, consume los módulos, presenta evaluaciones, consulta sus notas y descarga su constancia. |
| **Administrador / coordinación** | Publica y edita módulos, carga materiales, edita el banco de preguntas, consulta el avance de la cohorte y exporta reportes. |
| **Visitante** | Ve la presentación del programa y el temario antes de registrarse. |

Se contempla un tercer rol futuro (**tutor**: puede editar el contenido de módulos asignados sin acceso a la administración general), previsto en el modelo de datos pero no implementado en el MVP.

---

## 2. Alcance

### Incluido en el MVP (v1)

- Registro y autenticación con correo y contraseña.
- Catálogo de seis módulos con lecciones tipificadas (lectura / video / PDF).
- Marcado de lección vista y cálculo de avance por módulo y general.
- Evaluación por módulo: preguntas de selección múltiple, calificación automática sobre 100, **nota mínima de aprobación 70**, intentos ilimitados, retroalimentación por pregunta.
- Historial de notas del participante (se toma la nota más alta por módulo).
- Panel de administración: métricas de cohorte, aprobación por módulo, listado de participantes, publicación/despublicación de módulos.
- Constancia de finalización al aprobar los seis módulos.

### Fuera del MVP (fase 2)

Foros y mensajería, videoconferencia, pasarela de pago, ruta de aprendizaje adaptativa, app móvil nativa, SSO institucional, emisión de certificados con firma digital, subtítulos automáticos.

---

## 3. Reglas de negocio

1. La evaluación de un módulo se habilita cuando el participante marcó **todas** sus lecciones como vistas.
2. La nota es `redondear(respuestas_correctas / total_preguntas × 100)`.
3. Se aprueba con **nota ≥ 70**. Los intentos son ilimitados y todos quedan registrados; para la nota final vale el mejor intento.
4. El promedio general es el promedio de las mejores notas de los módulos presentados.
5. La constancia se emite solo cuando los seis módulos están aprobados.
6. Los módulos son independientes: no se exige aprobar el módulo *n* para abrir el *n+1* (regla configurable si el cliente quiere secuencia obligatoria).
7. Un módulo despublicado deja de aparecer para los participantes, pero no borra su historial de notas.

---

## 4. Modelo de datos

```
usuario
  id            uuid  pk
  nombre        text
  correo        text  unique
  clave_hash    text            -- bcrypt/argon2, nunca texto plano
  entidad       text  null
  rol           enum(participante, tutor, admin)
  verificado    bool
  creado_en     timestamptz

modulo
  id            uuid  pk
  numero        int   unique    -- 1..6, define el orden
  titulo        text
  resumen       text
  publicado     bool
  umbral        int             -- nota mínima, por defecto 70
  creado_en     timestamptz

leccion
  id            uuid  pk
  modulo_id     uuid  fk -> modulo
  orden         int
  titulo        text
  tipo          enum(lectura, video, pdf)
  contenido     text  null      -- markdown/html para lecturas
  recurso_url   text  null      -- PDF o video
  duracion_min  int

progreso
  usuario_id    uuid  fk
  leccion_id    uuid  fk
  visto_en      timestamptz
  pk(usuario_id, leccion_id)

pregunta
  id            uuid  pk
  modulo_id     uuid  fk
  enunciado     text
  opciones      jsonb           -- ["a","b","c","d"]
  correcta      int             -- índice de la opción correcta
  retroalim     text            -- se muestra al calificar

intento
  id            uuid  pk
  usuario_id    uuid  fk
  modulo_id     uuid  fk
  nota          int             -- 0..100
  correctas     int
  total         int
  respuestas    jsonb           -- para auditoría y análisis de ítems
  presentado_en timestamptz

constancia
  id            uuid  pk
  usuario_id    uuid  fk
  codigo        text  unique    -- verificable por URL pública
  emitida_en    timestamptz
```

**Índices sugeridos:** `intento(usuario_id, modulo_id)`, `progreso(usuario_id)`, `leccion(modulo_id, orden)`, `usuario(correo)`.

---

## 5. Pantallas

| # | Pantalla | Contenido |
|---|---|---|
| 1 | Acceso / registro | Presentación del programa + formulario de ingreso o inscripción. |
| 2 | Inicio (ruta formativa) | Avance total, módulos aprobados, promedio, tarjetas de los seis módulos con su estado. |
| 3 | Módulo | Lista de lecciones con marcado de vistas, materiales, acceso a la evaluación e historial de intentos. |
| 4 | Evaluación | Preguntas de selección múltiple, validación de respuestas completas. |
| 5 | Resultado | Nota, estado, revisión pregunta por pregunta con retroalimentación. |
| 6 | Mis notas | Tabla por módulo: avance, intentos, mejor nota, estado; descarga de constancia. |
| 7 | Administración | Métricas de cohorte, aprobación por módulo, gestión de publicación, tabla de participantes. |
| 8 | Editor de contenidos *(fase 2)* | Alta y edición de lecciones, carga de PDF, banco de preguntas. |

Todas las pantallas responden a móvil, tableta y escritorio, y funcionan en tema claro y oscuro.

---

## 6. Arquitectura técnica

### 6.1 Prototipo entregado (demo)

Aplicación de un solo archivo HTML, sin servidor: toda la lógica corre en el navegador y el estado persiste en `localStorage`. Sirve para **mostrar el producto y validar el alcance con el cliente**; no debe usarse en operación real (las contraseñas no están cifradas y los datos no salen del navegador de cada visitante).

### 6.2 Arquitectura recomendada para producción

```
Navegador
   │  HTTPS
   ▼
Frontend  ── React + Vite (SPA)  ó  Next.js si se requiere SEO del temario
   │  API REST/JSON con token JWT
   ▼
Backend   ── opción A: Django + Django REST Framework   (recomendada)
             opción B: FastAPI + SQLAlchemy
             opción C: Supabase (BaaS: auth + Postgres + storage, sin backend propio)
   ▼
PostgreSQL          Almacenamiento de objetos (PDF y video: S3/R2/Supabase Storage)
```

**Recomendación:** *Django + DRF + PostgreSQL + React*. Razones: el panel de administración de Django cubre desde el primer día la carga de módulos, lecciones y preguntas sin programar un editor; el sistema de usuarios, permisos y recuperación de contraseña viene resuelto; y es el stack más fácil de entregar a una entidad pública para que lo mantenga.

**Si el objetivo es minimizar costo y tiempo:** *Supabase + React*, que entrega autenticación, base de datos Postgres y almacenamiento de archivos en el plan gratuito, sin servidor propio que administrar.

### 6.3 Endpoints principales

```
POST   /api/auth/registro          crear cuenta
POST   /api/auth/login             obtener token
GET    /api/modulos                catálogo (publicados)
GET    /api/modulos/{id}           módulo con lecciones y avance del usuario
POST   /api/progreso               marcar lección vista
GET    /api/modulos/{id}/evaluacion   preguntas (sin la respuesta correcta)
POST   /api/modulos/{id}/intentos     enviar respuestas → devuelve nota
GET    /api/mis-notas              historial consolidado
GET    /api/constancia             emitir/descargar (si aprobó los 6)
GET    /api/admin/metricas         panel de coordinación
GET    /api/admin/participantes    listado con avance
```

**Regla de seguridad clave:** la respuesta correcta **nunca** se envía al navegador antes de calificar; la calificación ocurre siempre en el servidor.

---

## 7. Seguridad y datos personales

- Contraseñas con hash (argon2 o bcrypt); nunca en texto plano ni en logs.
- HTTPS obligatorio; tokens de sesión con expiración y renovación.
- Verificación de correo antes de emitir constancia.
- Datos personales tratados conforme a la **Ley 1581 de 2012**: aviso de privacidad, autorización explícita en el registro, finalidad declarada (formación y expedición de constancias) y canal para solicitar supresión.
- Copias de seguridad diarias de la base de datos.
- Registro de auditoría de los cambios de contenido y de las calificaciones.
- Accesibilidad: contraste AA, navegación por teclado, texto alternativo en imágenes, subtítulos en video.

---

## 8. Despliegue y costos

| Componente | Opción gratuita | Nota |
|---|---|---|
| Frontend | Vercel / Netlify / GitHub Pages | Suficiente para una SPA. |
| Backend | Render, Railway o Fly.io (capa gratuita) | La capa gratuita suspende por inactividad; aceptable en piloto. |
| Base de datos | Supabase o Neon (Postgres gratuito) | Límite de almacenamiento; monitorear. |
| PDF y video | Cloudflare R2 / Supabase Storage; video en YouTube "no listado" | El video propio es lo que más cuesta alojar. |
| Dominio | Costo anual bajo, único gasto obligatorio | |

Un piloto de hasta ~500 participantes puede operar sin costo de infraestructura, con un dominio propio como único gasto.

---

## 9. Plan de trabajo sugerido

| Fase | Entregable | Duración estimada |
|---|---|---|
| 0 | Prototipo navegable + este documento | **Hecho** |
| 1 | Validación con el cliente: alcance, marca, temario definitivo | 2–3 días |
| 2 | Modelo de datos y backend (auth, módulos, progreso, evaluaciones) | 1,5 semanas |
| 3 | Frontend conectado a la API | 1,5 semanas |
| 4 | Carga de contenidos reales: lecciones, PDF, banco de preguntas | 1 semana (depende de los materiales) |
| 5 | Panel de administración y reportes | 1 semana |
| 6 | Pruebas, accesibilidad, despliegue y capacitación | 1 semana |

---

## 10. Qué se necesita del cliente para continuar

1. **Título y descripción de los seis módulos**, con objetivos de aprendizaje.
2. **Materiales por módulo**: textos de lectura, PDF, enlaces de video.
3. **Banco de preguntas** (mínimo 5 por módulo, ideal 10 para rotarlas) con la respuesta correcta y su retroalimentación.
4. **Decisiones de política**: nota mínima, si los intentos son ilimitados, si los módulos se cursan en orden obligatorio, qué debe decir la constancia y quién la firma.
5. **Identidad visual**: nombre definitivo de la plataforma, logo, colores institucionales.
6. **Alcance del piloto**: número esperado de participantes y fecha de apertura.

---

## 11. Riesgos y decisiones abiertas

| Riesgo | Mitigación |
|---|---|
| Los materiales llegan tarde o incompletos | La plataforma se construye con contenido de muestra reemplazable; la carga es la última fase. |
| Alojamiento de video pesado | Usar YouTube no listado o Vimeo en lugar de almacenamiento propio. |
| La capa gratuita del backend se suspende por inactividad | Aceptable en piloto; prever migración a plan pago si el uso crece. |
| Filtración del banco de preguntas | Calificación en servidor + rotación aleatoria de preguntas y opciones. |
| La entidad exige alojamiento propio | El stack Django + Postgres es instalable en servidor propio sin cambios. |

---

*Documento preliminar. Se actualiza cuando el cliente confirme temario, política de evaluación e identidad visual.*
