# Indicadores y estructura del tablero

Curso «Innovación pública y formulación de proyectos CTeI para el fortalecimiento de
capacidades territoriales en Casanare» · Gobernación de Casanare · Equipo CTeI

Autor: Johan Esteban Martínez Jaimes

Este documento define cada cifra que muestran el panel de seguimiento (`paginas/admin.html`)
y el informe PDF (`paginas/reporte.html`). Las fórmulas están implementadas en
`js/nucleo/estadisticas.js`. Cualquier cambio de definición se hace primero aquí y después
en ese archivo.

---

## 1. Población y fuentes

| Concepto | Definición |
|---|---|
| **Participante** | Usuario con rol `participante`. Las cuentas de coordinación no se cuentan. |
| **Sección** | Cada una de las 7 partes de estudio de un módulo. El curso tiene 6 × 7 = 42. |
| **Evaluación (intento)** | Un envío de la evaluación calificativa de un módulo. Los intentos son ilimitados. |
| **Nota** | Porcentaje de respuestas correctas de un intento, de 0 a 100. |
| **Mejor nota** | Nota más alta de un participante en un módulo. Es la que cuenta para aprobar. |
| **Nota mínima** | 70 (`contenido/curso.json`, campo `notaMinima`). |

**Fuentes:** registro de usuarios, registro de secciones vistas por participante y registro de
intentos con las respuestas elegidas en cada pregunta.

---

## 2. Indicadores de resumen

| # | Indicador | Fórmula | Qué responde |
|---|---|---|---|
| I1 | Inscritos | número de participantes | ¿Cuántas personas se registraron? |
| I2 | Iniciaron el curso | participantes con al menos una sección vista | ¿Cuántos pasaron del registro a estudiar? |
| I3 | Avance promedio | promedio de (secciones vistas ÷ 42 × 100) | ¿Qué tanto del contenido se ha recorrido? |
| I4 | Nota promedio | promedio de todas las mejores notas por participante y módulo | ¿Qué nivel de dominio se alcanza? |
| I5 | Evaluaciones presentadas | número total de intentos | ¿Qué tanto se usa la autoevaluación? |
| I6 | Finalizaron | participantes con mejor nota ≥ 70 en los 6 módulos | ¿Cuántos completaron la ruta? |
| I7 | Tasa de finalización | I6 ÷ I1 × 100 | Proporción que completa el curso |
| I8 | Aprobación de intentos | intentos con nota ≥ 70 ÷ I5 × 100 | ¿Qué tan exigente resulta la evaluación? |

---

## 3. Indicadores por módulo

| # | Indicador | Fórmula |
|---|---|---|
| M1 | Iniciaron | participantes con al menos una sección vista del módulo |
| M2 | Completaron el estudio | participantes con las 7 secciones vistas |
| M3 | Presentaron | participantes con al menos un intento en el módulo |
| M4 | Aprobaron | participantes con mejor nota ≥ 70 |
| M5 | % de aprobación sobre inscritos | M4 ÷ I1 × 100 — la caída entre módulos es la **deserción** |
| M6 | % de aprobación sobre quienes presentaron | M4 ÷ M3 × 100 — mide la **dificultad** |
| M7 | Nota promedio | promedio de las mejores notas del módulo |
| M8 | Nota del primer intento | promedio de la nota del primer intento de cada participante |
| M9 | Intentos para aprobar | promedio del número de intento en que cada participante aprobó |

Lectura conjunta: un módulo con **M5 bajo y M6 alto** pierde gente antes de la evaluación
(problema de permanencia); uno con **M6 bajo o M9 alto** tiene una evaluación difícil o un
tema mal comprendido.

---

## 4. Indicadores por pregunta

| # | Indicador | Fórmula |
|---|---|---|
| P1 | Respuestas | veces que la pregunta fue respondida (todos los intentos) |
| P2 | % de acierto | respuestas correctas ÷ P1 × 100 |
| P3 | Marca de revisión | se activa cuando P2 < 50 % |
| P4 | Opción incorrecta más elegida | la opción errada con más respuestas y su porcentaje |
| P5 | Estado de validación | `por-validar` o `validada`, según `contenido/preguntas/mX.json` |

Una pregunta marcada no es necesariamente una pregunta mala. Hay que revisar:

- la redacción, si la opción incorrecta más elegida es parecida a la correcta;
- el contenido del módulo, si la opción elegida revela una idea equivocada frecuente.

---

## 5. Distribución de notas

Cuenta **todos** los intentos por nota obtenida. Con 4 preguntas por evaluación solo existen
cinco notas posibles (0, 25, 50, 75, 100) y se muestran tal cual. Si el banco crece y aparecen
más de 8 valores distintos, se agrupan en tramos de 10 puntos. La línea «mínimo 70» separa
los intentos que aprueban de los que no.

---

## 6. Estructura del tablero

El panel y el informe usan las mismas piezas (`js/ui/tablero.js`), en este orden:

| Bloque | Forma | Indicadores | Por qué esa forma |
|---|---|---|---|
| Resumen | 6 cifras | I1–I7 | Son valores únicos: una gráfica no agrega nada |
| Lo que muestran los datos | Texto automático | Derivado de todo lo anterior | Da la conclusión sin tener que interpretar las gráficas |
| Embudo de participación | Barras horizontales, rampa de un solo tono | I1, I2, presentaron alguna evaluación, aprobaron al menos un módulo, I6 | Muestra en qué etapa se pierde la gente |
| Distribución de notas | Columnas con línea de corte | §5 | Forma de la distribución y cuántos intentos aprueban |
| Aprobación por módulo | Barras horizontales | M5, M4 | La caída de barra a barra es la deserción |
| Nota promedio por módulo | Barras con línea de referencia en 70 | M7, M9 | Qué tan lejos queda cada módulo del mínimo |
| Acierto por pregunta | Barras agrupadas por módulo, referencia en 50 % | P2, P3, P4 | Ubica las preguntas que conviene revisar |
| Participantes | Tabla | Avance, mejor nota M1–M6, promedio, estado | Seguimiento individual |

Criterios de diseño aplicados:

- una sola serie usa un solo color;
- el naranja se reserva para la marca «Revisar» y siempre va con ícono y texto;
- cada gráfica tiene su tabla de datos equivalente;
- ninguna gráfica usa doble eje;
- los valores se leen sin depender del color.

---

## 7. Salidas

| Salida | Contenido | Uso |
|---|---|---|
| Panel (`admin.html`) | Todo lo anterior, interactivo | Seguimiento diario de la coordinación |
| Informe PDF (`reporte.html`) | Mismas cifras, tamaño carta, con nota metodológica | Informes a la Gobernación y a la universidad |
| CSV | Una fila por intento: fecha, participante, entidad, módulo, nota, aprobado, acierto por pregunta | Análisis externo en Excel, R o Python |

---

## 8. Limitaciones actuales

- Los datos vienen de Supabase: el tablero muestra solo participantes reales inscritos.
- El tiempo de dedicación no se mide todavía. Requiere registrar la hora de entrada y
  salida de cada sección.
- No hay cortes por fecha ni por entidad. Son la siguiente mejora natural del tablero
  cuando exista una cohorte real.
