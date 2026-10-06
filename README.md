# Curso CTeI Casanare — aula virtual

Plataforma del curso virtual de autoformación tipo MOOC **«Innovación pública y formulación
de proyectos CTeI para el fortalecimiento de capacidades territoriales en Casanare»**.

Gobernación de Casanare · Departamento Administrativo de Planeación · Equipo CTeI.

> **Estado: versión funcional.** Usuarios, avance y notas se guardan en Supabase
> (PostgreSQL + autenticación) con reglas de seguridad por fila. La calificación ocurre en
> el servidor. Para ponerla en marcha siga [`docs/puesta-en-marcha.md`](docs/puesta-en-marcha.md).

---

## Cómo levantarlo

El proyecto lee su contenido de archivos JSON, y los navegadores bloquean esa lectura cuando
la página se abre con doble clic (`file://`). Hay que servirlo por HTTP:

```bash
python -m http.server 8000
# abrir http://localhost:8000
```

En VS Code, la extensión **Live Server** hace lo mismo con un clic.

## Cómo publicarlo

Subir el repositorio a GitHub y activar **Settings → Pages → Deploy from a branch → main / (root)**.
El archivo `.nojekyll` evita que GitHub ignore carpetas que empiezan por guion bajo.
Paso a paso completo en [`docs/publicar.md`](docs/publicar.md).

## Cuentas

No hay cuentas de prueba. Los participantes se inscriben desde la página de ingreso; la
cuenta de coordinación es una cuenta inscrita a la que se le da el rol `admin` con
`supabase/crear-admin.sql`. Detalles y medidas de seguridad en
[`docs/puesta-en-marcha.md`](docs/puesta-en-marcha.md).

---

## Qué hay en cada carpeta

| Carpeta | Qué guarda |
|---|---|
| raíz | Solo `index.html` (el ingreso) y `404.html`; el resto son archivos de configuración |
| `paginas/` | Las pantallas internas: inicio, módulo, evaluación, resultado, notas, seguimiento, informe y revisión |
| `assets/` | Imágenes de marca, infografías y PDF del curso |
| `css/` | `base` (colores y tipografía) · `layout` (encabezado, pie) · `componentes` · `vistas` · `graficas` · `reporte` |
| `js/datos/` | De dónde salen y a dónde van los datos |
| `js/nucleo/` | Reglas: sesión, avance, calificación y estadísticas |
| `js/ui/` | Encabezado, pie, avisos, gráficas y tablero |
| `js/vistas/` | Una por página |
| `contenido/` | Textos de los módulos, preguntas y catálogo de materiales — **editable sin programar** |
| `docs/` | Documentación del proyecto |
| `supabase/` | Esquema de base de datos, reglas de seguridad y script para crear la coordinación |

Dos reglas sostienen el diseño:

1. **Solo `js/datos/almacen.js` sabe dónde viven los datos** (Supabase). Si se migra a otro
   backend se reescribe ese archivo y el resto sigue igual.
2. **Ninguna página escribe rutas a mano.** `js/config.js` calcula la raíz del sitio con
   `import.meta.url` y expone `recurso()` y `PAGINAS`, así que las pantallas funcionan igual
   estén en la raíz o en `paginas/`, y el sitio puede publicarse en un subdirectorio.

---

## Seguimiento, informe PDF y datos

Con el perfil de coordinación, **`admin.html`** muestra:

- Seis indicadores de resumen y un bloque **«Lo que muestran los datos»** redactado
  automáticamente a partir de las cifras.
- Gráficas: embudo de participación, distribución de notas, aprobación por módulo,
  nota promedio por módulo y acierto por pregunta (marca en naranja las preguntas bajo 50 %).
  Cada gráfica trae su tabla de datos equivalente.
- Tabla de participantes con la mejor nota en cada módulo.

**Generar informe PDF** abre `reporte.html`, una hoja tamaño carta con las mismas cifras,
numeración de páginas y nota metodológica. El botón **Descargar PDF** abre el diálogo de
impresión: se elige **Guardar como PDF** (Chrome o Edge dan el mejor resultado).
No usa librerías, así que el PDF sale en vectores y con texto seleccionable.

**Exportar datos (CSV)** descarga una fila por evaluación, con el acierto de cada pregunta,
separada por punto y coma para que Excel en español la abra sin configurar nada.

La definición de cada indicador está en [`docs/indicadores.md`](docs/indicadores.md).

---

## Revisión de materiales

La plataforma incluye una pantalla propia para la retroalimentación del equipo de CTeI:
**`revision.html`**, accesible desde el menú del usuario con el perfil de coordinación.

Allí aparecen las once piezas gráficas con su número impreso, el módulo al que quedaron
asignadas y las inconsistencias detectadas. Cada pieza tiene un campo de decisión y
observación; el botón **Exportar observaciones** descarga un archivo JSON con lo registrado
para que el equipo de desarrollo lo aplique sobre `contenido/materiales.json`.

**Inconsistencias abiertas hoy:** siete piezas traen impreso un número de módulo distinto al
del documento «MÓDULOS DE FORMACIÓN», una misma pieza cubre los módulos 5 y 6, y el módulo 6
no tiene pieza propia. Ver `contenido/materiales.json`.

---

## Pendientes

- Validar el banco de preguntas con los responsables técnicos de cada módulo
  (`contenido/preguntas/*.json`, campo `estado`; las respuestas correctas están en la tabla `claves` de Supabase).
- Cargar los PDF y audiovisuales de cada módulo en `assets/docs/`.
- Conseguir el logotipo CTeI y el escudo en vector.
- Enlazar las redes institucionales en `js/config.js` (`ENLACES_INSTITUCIONALES`).
- Configurar un SMTP institucional en Supabase antes de abrir inscripciones masivas.
- Generar la constancia en PDF.
