# Estructura de carpetas — Plataforma CTeI Casanare

**Proyecto:** curso virtual de autoformación «Innovación pública y formulación de proyectos CTeI»
**Enfoque:** sitio estático modular, sin compilación · publicable en GitHub Pages
**Fecha:** 14 de septiembre de 2026 · proyecto migrado

---

## 1. Por qué salir del archivo único

El prototipo actual es un solo `.html` de 4,3 MB con todo adentro: estilos, lógica, contenido de los seis módulos y diez infografías en base64. Funciona para mostrar, pero no para trabajar:

| Problema hoy | Qué cambia al modularizar |
|---|---|
| Cualquier cambio toca el mismo archivo | Cada persona edita el archivo de su tema, sin conflictos en Git |
| Git guarda 4,3 MB por cada commit | Las imágenes cambian poco y el código pesa kilobytes |
| El navegador descarga todo antes de mostrar algo | Solo carga la página y las imágenes que está viendo |
| Cambiar un texto del módulo 3 exige leer código | Se edita un `.json` de contenido, sin tocar JavaScript |
| Migrar a Django significa reescribir | La lógica ya está separada por responsabilidad |

---

## 2. Árbol del proyecto

```
curso-ctei-casanare/
│
├── index.html                    Acceso e inscripción (entrada del sitio)
├── 404.html                      Página de error (GitHub Pages la busca en la raíz)
│
├── .nojekyll                     Evita que GitHub Pages procese el sitio con Jekyll
├── .gitignore
├── README.md                     Cómo levantar, publicar y qué está pendiente
│
├── paginas/                      ── LAS PANTALLAS INTERNAS ──
│   ├── inicio.html               Catálogo de módulos y avance del participante
│   ├── modulo.html               Vista de un módulo        → modulo.html?m=m1
│   ├── evaluacion.html           Evaluación calificativa   → evaluacion.html?m=m1
│   ├── resultado.html            Resultado del intento
│   ├── notas.html                Historial de notas del participante
│   ├── admin.html                Panel de seguimiento con gráficas (coordinación)
│   ├── reporte.html              Informe imprimible → «Guardar como PDF»
│   └── revision.html             Revisión de materiales (coordinación)
│
├── assets/
│   ├── img/
│   │   ├── marca/                escudo, encabezado institucional, mascota, banda
│   │   └── infografias/          las diez piezas gráficas del curso
│   ├── docs/                     PDF descargables por módulo (pendientes)
│   └── favicon.ico
│
├── css/
│   ├── base.css                  Variables de color, tipografía, reset
│   ├── layout.css                Cabecera GOV.CO, barra lateral, pie, rejilla
│   ├── componentes.css           Botones, campos, pastillas, tablas, evaluación
│   ├── vistas.css                Estilos propios de cada pantalla
│   ├── graficas.css              Barras, columnas, tooltips, tablas de datos
│   └── reporte.css               Hoja carta del informe y reglas de impresión
│
├── js/
│   ├── config.js                 Raíz del sitio, rutas de páginas y constantes
│   │
│   ├── datos/                    ── DE DÓNDE SALEN Y A DÓNDE VAN LOS DATOS ──
│   │   ├── almacen.js            Conexión con Supabase (auth, avance, intentos)
│   │   ├── contenidos.js         Carga contenido/*.json
│   │   └── revisiones.js         Observaciones de materiales y su exportación
│   │
│   ├── nucleo/                   ── REGLAS DEL NEGOCIO, SIN HTML ──
│   │   ├── sesion.js             Ingreso, inscripción, guardias de página
│   │   ├── progreso.js           Secciones vistas, avance, estado del módulo
│   │   ├── evaluacion.js         Calificar, intentos, mejor nota, promedio
│   │   └── estadisticas.js       Indicadores, embudo, acierto por pregunta, hallazgos
│   │
│   ├── ui/                       ── PIEZAS VISUALES REUTILIZABLES ──
│   │   ├── marco.js              Monta encabezado + barra lateral + pie
│   │   ├── cabecera.js           Franja GOV.CO, marca y menú principal
│   │   ├── pie.js                Banda de valores, pie institucional y lateral
│   │   ├── componentes.js        Pastillas, barras, lupa, utilidades
│   │   ├── avisos.js             Notificaciones emergentes
│   │   ├── graficas.js           Gráficas HTML/CSS sin librerías
│   │   └── tablero.js            Tablero compartido por el panel y el informe; CSV
│   │
│   └── vistas/                   ── UNA POR PÁGINA ──
│       ├── acceso.js   ├── modulo.js      ├── notas.js
│       ├── inicio.js   ├── evaluacion.js  ├── admin.js
│                       └── resultado.js   ├── revision.js
│                                          └── reporte.js
│
├── contenido/                    ── EDITABLE SIN SABER PROGRAMAR ──
│   ├── curso.json                Nombre, modalidad, duración, ruta, secciones
│   ├── modulos.json              Los seis módulos completos
│   ├── materiales.json           Catálogo de infografías y su estado de revisión
│   └── preguntas/
│       └── m1.json … m6.json     Banco de preguntas, uno por módulo
│
└── docs/
    ├── estructura.md             Este documento
    ├── arquitectura.md           Modelo de datos, endpoints, plan de producción
    ├── indicadores.md            Definición de indicadores y estructura del tablero
    ├── publicar.md               Paso a paso para GitHub Pages
    └── guia-contenidos.md        Cómo editar un módulo, una infografía o una pregunta
```

---

## 3. La regla que sostiene todo

> **Ningún archivo de `vistas/` o `ui/` toca `localStorage` directamente. Solo `datos/almacen.js` sabe dónde viven los datos.**

Esa sola regla es la que permite que el día que exista el backend en Django no haya que reescribir la plataforma: se cambia el cuerpo de `almacen.js` para que llame a la API en vez de al navegador, y el resto del código sigue igual.

```js
// js/datos/almacen.js  — versión estática de hoy
export async function guardarIntento(intento) {
  const db = leerLocal();
  db.intentos.push(intento);
  escribirLocal(db);
}

// la misma función, el día que exista backend
export async function guardarIntento(intento) {
  await fetch(`${API}/intentos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
    body: JSON.stringify(intento),
  });
}
```

### La segunda regla: ninguna página escribe rutas a mano

`js/config.js` calcula la raíz del sitio con `import.meta.url` y expone `recurso()` y `PAGINAS`.
Por eso las pantallas viven en `paginas/` sin que ningún archivo tenga `../` regados por dentro,
y el sitio funciona igual publicado en la raíz de un dominio o en un subdirectorio de GitHub Pages.

```js
export const BASE = new URL('../', import.meta.url).href;     // js/config.js → raíz del sitio
export const recurso = (r) => BASE + r;                        // recurso('assets/img/…')
export const PAGINAS = { inicio: BASE + 'paginas/inicio.html' };
```

Las tres capas, de abajo hacia arriba:

| Capa | Carpeta | Puede llamar a | Nunca hace |
|---|---|---|---|
| Datos | `js/datos/` | nada más | Generar HTML |
| Núcleo | `js/nucleo/` | `datos/` | Tocar el DOM |
| Interfaz | `js/vistas/`, `js/ui/` | `nucleo/`, `datos/` | Guardar datos por su cuenta |

---

## 4. Por qué el contenido va en JSON y no en el código

Los textos de los seis módulos y las 24 preguntas no son código: son material del curso que la coordinación de CTeI va a corregir varias veces. Si viven dentro de un `.js`, cada corrección de una coma exige abrir código y arriesgarse a romper la plataforma.

En `contenido/modulos.json` un módulo se ve así:

```json
{
  "id": "m2",
  "numero": 2,
  "titulo": "Problemas públicos, retos territoriales y diagnóstico basado en evidencia",
  "color": "#E65401",
  "duracion": "8 horas",
  "nivel": "Básico-aplicado",
  "producto": "Árbol de problemas, árbol de objetivos y reto territorial",
  "infografias": ["m2-ciclo-formulacion.jpg", "m2-arbol-objetivos.jpg"],
  "proposito": "Transformar una necesidad u oportunidad general en un problema público…",
  "resultados": ["Diferencia necesidad, problema y solución.", "…"],
  "contenidos": ["De la oportunidad al problema central", "…"],
  "recursos": ["Audiovisuales del Módulo 2", "…"]
}
```

Las preguntas van aparte, un archivo por módulo (`contenido/preguntas/m2.json`), por tres razones: cada módulo tiene un responsable técnico distinto que valida sus preguntas, se pueden revisar y aprobar por separado, y el día que la calificación pase al servidor solo se mueven esos seis archivos.

---

## 5. Convenciones

- **Nombres de archivo:** minúsculas, sin tildes ni espacios, palabras separadas por guion medio → `m2-arbol-objetivos.jpg`, nunca `Árbol de Objetivos.JPG`. GitHub Pages distingue mayúsculas de minúsculas y Windows no: esa diferencia rompe sitios en producción.
- **Imágenes:** JPG para infografías y fotos, SVG para logos y escudos, PNG solo cuando se necesita transparencia. Las infografías a 1100 px de ancho y calidad 80 son suficientes para pantalla.
- **Un archivo, una responsabilidad.** Si `modulo.js` pasa de 300 líneas, algo de ahí pertenece a `nucleo/` o a `ui/`.
- **Rutas siempre relativas** (`assets/img/...`, no `/assets/img/...`): en GitHub Pages el sitio cuelga de `usuario.github.io/repositorio/`, y la barra inicial apunta al dominio raíz.
- **Commits en español, en presente:** `agrega infografías del módulo 4`, `corrige cálculo del promedio`.

---

## 6. Cómo se trabaja el proyecto

`fetch()` no funciona abriendo el HTML con doble clic: el navegador bloquea la lectura de archivos locales por seguridad (protocolo `file://`). Para desarrollar hay que levantar un servidor local, que no requiere instalar nada si ya hay Python:

```bash
cd curso-ctei-casanare
python -m http.server 8000
# abrir http://localhost:8000
```

En VS Code, la extensión **Live Server** hace lo mismo con un clic y recarga al guardar.

Para publicar: subir el repositorio a GitHub y activar **Settings → Pages → Deploy from a branch → main / (root)**. El archivo `.nojekyll` en la raíz evita que GitHub ignore carpetas y archivos que empiezan con guion bajo.

---

## 7. Orden de migración sugerido

Un paso por sesión de trabajo, verificando que el sitio siga funcionando antes de seguir:

1. **Crear el repositorio y el árbol vacío**, con `README.md` y `.nojekyll`.
2. **Sacar las imágenes**: extraer las diez infografías del base64 a `assets/img/infografias/` y reemplazar cada `src` por su ruta. Aquí el archivo pasa de 4,3 MB a unos 90 KB, que es el cambio de mayor efecto.
3. **Separar el CSS** en los cuatro archivos, en este orden: `base.css` (las variables de color primero), `layout.css`, `componentes.css`, `vistas.css`.
4. **Extraer el contenido a JSON**: `curso.json`, `modulos.json` y los seis archivos de preguntas.
5. **Partir el JavaScript**: primero `config.js` y `datos/almacen.js`, después `nucleo/`, y de último las vistas.
6. **Dividir las páginas**: de una sola página con siete estados a siete archivos `.html`, cada uno cargando su vista.
7. **Publicar en GitHub Pages** y verificar rutas, imágenes y navegación en el sitio publicado.

Conviene hacer un commit por paso, para poder devolverse si algo se rompe.

---

## 8. Qué sobrevive cuando llegue Django

Cuando la plataforma pase a tener backend, la estructura no se bota:

| Carpeta | Destino |
|---|---|
| `css/`, `assets/` | Pasan tal cual a `static/` del proyecto Django |
| `contenido/*.json` | Se convierten en la carga inicial de la base de datos (`loaddata`) |
| `js/nucleo/` | Las reglas se reimplementan en el servidor; el archivo sirve de especificación |
| `js/datos/almacen.js` | Único archivo que se reescribe por completo |
| `js/vistas/`, `js/ui/` | Siguen funcionando; cambian solo las llamadas de datos |
| `*.html` | Se vuelven plantillas Django con muy pocos cambios |

Por eso la separación de hoy no es trabajo perdido: es el borrador del sistema real.

---

---

## 8-bis. El catálogo de materiales

`contenido/materiales.json` es el inventario de las piezas gráficas del curso. Cada una registra
el número de módulo **impreso en la pieza**, el módulo al que quedó **asignada en la plataforma**
y su estado de revisión. Existe porque al montar las infografías aparecieron inconsistencias:
siete piezas traen impreso un número distinto al del documento de formación, una cubre dos
módulos a la vez y el módulo 6 no tiene pieza propia.

| Estado | Significado |
|---|---|
| `coincide` | El número impreso y el módulo asignado coinciden |
| `numero-no-coincide` | El tema corresponde al módulo, pero la pieza trae otro número |
| `compartida` | Una sola pieza cubre contenidos de dos módulos |
| `faltante` | El módulo no tiene pieza propia |

Cuando el estado no es `coincide`, la plataforma muestra la observación como nota debajo de la
infografía, y la pantalla `revision.html` permite a la coordinación registrar qué hacer con cada
pieza y exportar esas decisiones en un archivo para el equipo de desarrollo.

## 9. Qué falta decidir

- Nombre definitivo del repositorio (propuesta: `curso-ctei-casanare`).
- Si el repositorio queda a nombre personal o de una organización de la Gobernación — conviene lo segundo, para que el proyecto no dependa de una cuenta individual.
- Quién valida el banco de preguntas antes de que quede publicado.
- Si los PDF de cada módulo se alojan en el repositorio o en un servicio externo: GitHub tiene un límite recomendado de 1 GB por repositorio y los archivos grandes son incómodos en Git.
