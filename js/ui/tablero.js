/* Piezas del tablero de resultados.
   Las usan el panel de seguimiento (admin.js) y el informe PDF (reporte.js),
   así ambos muestran exactamente las mismas cifras. */

import * as almacen from '../datos/almacen.js';
import * as contenidos from '../datos/contenidos.js';
import * as est from '../nucleo/estadisticas.js';
import { esc, fecha } from './componentes.js';
import { barrasH, columnas, leyenda, tablaDatos, tarjeta } from './graficas.js';

const fmt = (n, suf = '') => n === null || n === undefined ? '—' : String(n).replace('.', ',') + suf;

/* Reúne todo lo necesario y devuelve los cálculos listos */
export async function calcular() {
  await almacen.iniciar();
  const curso = await contenidos.curso();
  const modulos = await contenidos.modulos();
  const preguntas = {};
  // El JSON público no trae la respuesta correcta: se completa con las claves del servidor.
  const claves = almacen.claves();
  for (const m of modulos) {
    preguntas[m.id] = (await contenidos.preguntas(m.id)).map((q, i) => ({ ...q, correcta: claves[m.id]?.[i]?.correcta }));
  }

  const usuarios = almacen.usuarios();
  const participantes = usuarios.filter(u => u.rol === 'participante');
  const ix = est.indexar({
    participantes, intentos: almacen.intentos(), modulos, secciones: curso.secciones,
    progresoDe: almacen.progresoDe, preguntas, umbral: curso.notaMinima
  });
  const porId = Object.fromEntries(usuarios.map(u => [u.id, u]));

  return {
    curso, modulos, ix, porId,
    resumen: est.resumen(ix),
    embudo: est.embudo(ix),
    porModulo: est.porModulo(ix),
    distribucion: est.distribucion(ix),
    porPregunta: est.porPregunta(ix),
    porParticipante: est.porParticipante(ix),
    esDemo: false
  };
}

/* ---------- hallazgos ---------- */
export function bloqueHallazgos(r) {
  const lista = est.hallazgos({ resumen: r.resumen, embudo: r.embudo, porModulo: r.porModulo,
    porPregunta: r.porPregunta, umbral: r.curso.notaMinima, modulos: r.modulos });
  return `
  <section class="hallazgos">
    <h3>Lo que muestran los datos</h3>
    <ul>${lista.map(h => `<li>${esc(h)}</li>`).join('')}</ul>
  </section>`;
}

/* ---------- indicadores ---------- */
export function kpis(r) {
  const s = r.resumen;
  return `
  <section class="cifras">
    <div class="cifra"><span class="v">${s.inscritos}</span><span class="k">Inscritos</span></div>
    <div class="cifra"><span class="v">${s.activos}</span><span class="k">Iniciaron el curso</span></div>
    <div class="cifra"><span class="v">${fmt(s.avancePromedio, '%')}</span><span class="k">Avance promedio</span></div>
    <div class="cifra"><span class="v">${fmt(s.notaPromedio)}</span><span class="k">Nota promedio</span></div>
    <div class="cifra"><span class="v">${s.evaluaciones}</span><span class="k">Evaluaciones presentadas</span></div>
    <div class="cifra"><span class="v">${s.finalizaron}</span><span class="k">Finalizaron · ${fmt(s.tasaFinalizacion, '%')}</span></div>
  </section>`;
}

/* ---------- embudo de participación ---------- */
export function graficaEmbudo(r) {
  const e = r.embudo;
  const filas = e.map((x, i) => ({
    etiqueta: x.etapa, valor: x.valor,
    texto: `${x.valor} · ${fmt(x.pct, '%')}`,
    color: `var(--embudo-${i + 1})`,
    tip: `${x.etapa}: ${x.valor} participantes (${fmt(x.pct, '%')} de los inscritos)`
  }));
  return tarjeta({
    id: 'g-embudo',
    titulo: 'Embudo de participación',
    descripcion: 'Cuántos inscritos llegan a cada etapa del curso. Muestra dónde se pierden participantes.',
    grafica: barrasH({ filas, max: e[0].valor || 1, marcasEje: marcasEnteras(e[0].valor || 1) }),
    pie: tablaDatos({ columnas: ['Etapa', 'Participantes', '% de inscritos'], numericas: [1, 2],
      filas: e.map(x => [esc(x.etapa), x.valor, fmt(x.pct, '%')]) })
  });
}

/* ---------- aprobación por módulo ---------- */
export function graficaAprobacion(r) {
  const filas = r.porModulo.map(m => ({
    etiqueta: `${m.numero}. ${m.titulo}`, punto: m.color, valor: m.pctAprobacion,
    texto: `${fmt(m.pctAprobacion, '%')} · ${m.aprobaron}`,
    tip: `Módulo ${m.numero}: aprobaron ${m.aprobaron} de ${r.resumen.inscritos} inscritos (${fmt(m.pctAprobacion, '%')})`
  }));
  return tarjeta({
    id: 'g-aprobacion',
    titulo: 'Aprobación por módulo',
    descripcion: 'Porcentaje de inscritos que aprobaron cada módulo. La caída de un módulo al siguiente es la deserción.',
    grafica: barrasH({ filas, max: 100, marcasEje: [0, 25, 50, 75, 100], sufijo: '%' }),
    pie: tablaDatos({ columnas: ['Módulo', 'Iniciaron', 'Presentaron', 'Aprobaron', '% de inscritos', '% de quienes presentaron'],
      numericas: [1, 2, 3, 4, 5],
      filas: r.porModulo.map(m => [`${m.numero}. ${esc(m.titulo)}`, m.iniciaron, m.presentaron, m.aprobaron,
        fmt(m.pctAprobacion, '%'), fmt(m.pctAprobacionPresentaron, '%')]) })
  });
}

/* ---------- nota promedio por módulo, contra la nota mínima ---------- */
export function graficaNotas(r) {
  const umbral = r.curso.notaMinima;
  const filas = r.porModulo.map(m => ({
    etiqueta: `${m.numero}. ${m.titulo}`, punto: m.color, valor: m.notaPromedio ?? 0,
    texto: m.notaPromedio === null ? 'sin datos' : fmt(m.notaPromedio),
    sub: m.intentosHastaAprobar ? `${intentosTxt(m.intentosHastaAprobar)} para aprobar` : '',
    tip: m.notaPromedio === null ? `Módulo ${m.numero}: sin evaluaciones`
      : `Módulo ${m.numero}: nota promedio ${fmt(m.notaPromedio)} · primer intento ${fmt(m.primerIntento)} · ${intentosTxt(m.intentosHastaAprobar)} en promedio para aprobar`
  }));
  return tarjeta({
    id: 'g-notas',
    titulo: 'Nota promedio por módulo',
    descripcion: `Mejor nota de cada participante, promediada. La línea marca la nota mínima de aprobación (${umbral}).`,
    grafica: barrasH({ filas, max: 100, marcasEje: [0, 25, 50, 75, 100], referencia: { valor: umbral, texto: `mínimo ${umbral}` } }),
    pie: tablaDatos({ columnas: ['Módulo', 'Nota promedio', 'Nota del primer intento', 'Intentos promedio para aprobar', 'Intentos totales'],
      numericas: [1, 2, 3, 4],
      filas: r.porModulo.map(m => [`${m.numero}. ${esc(m.titulo)}`, fmt(m.notaPromedio), fmt(m.primerIntento),
        fmt(m.intentosHastaAprobar), m.intentos]) })
  });
}

/* ---------- distribución de notas ---------- */
export function graficaDistribucion(r) {
  const umbral = r.curso.notaMinima;
  const d = r.distribucion;
  const total = d.reduce((s, x) => s + x.cuenta, 0) || 1;
  const nPreg = 4;
  const corte = d.findIndex(x => x.aprueba) - 1;
  const filas = d.map(x => ({
    etiqueta: x.clase,
    sub: x.desde === x.hasta ? `${Math.round(x.desde / 100 * nPreg)}/${nPreg} aciertos` : '',
    valor: x.cuenta,
    color: x.aprueba ? 'var(--graf-serie)' : 'var(--graf-atenuado)',
    tip: `Nota ${x.clase}: ${x.cuenta} intentos (${fmt(Math.round(x.cuenta / total * 100), '%')})`
  }));
  return tarjeta({
    id: 'g-distribucion',
    titulo: 'Distribución de notas',
    descripcion: `Todas las evaluaciones presentadas (${r.resumen.evaluaciones}), incluidos los intentos repetidos.`,
    grafica: leyenda([['var(--graf-serie)', `Aprueba (≥ ${umbral})`], ['var(--graf-atenuado)', 'No aprueba']]) +
      columnas({ filas, corte: corte >= 0 ? { despuesDe: corte, texto: `mínimo ${umbral}` } : null }),
    pie: tablaDatos({ columnas: ['Nota', 'Intentos', '% del total'], numericas: [1, 2],
      filas: d.map(x => [x.clase, x.cuenta, fmt(Math.round(x.cuenta / total * 100), '%')]) })
  });
}

/* ---------- análisis por pregunta ---------- */
export function graficaPreguntas(r) {
  const pp = r.porPregunta;
  const aRevisar = pp.filter(p => p.revisar);
  const filas = pp.map(p => ({
    grupo: `Módulo ${p.moduloNumero}`,
    etiqueta: `P${p.numero}. ${p.enunciado}`,
    valor: p.pctAcierto ?? 0,
    texto: p.pctAcierto === null ? 'sin datos' : fmt(p.pctAcierto, '%'),
    color: p.revisar ? 'var(--estado-revisar)' : 'var(--graf-serie)',
    marca: p.revisar ? { texto: 'Revisar' } : null,
    tip: `${p.enunciado} — acierto ${fmt(p.pctAcierto, '%')} en ${p.respuestas} respuestas` +
      (p.distractor ? ` · opción incorrecta más elegida: ${p.distractor.letra} (${fmt(p.distractor.pct, '%')})` : '')
  }));
  return tarjeta({
    id: 'g-preguntas', ancho: true,
    titulo: 'Acierto por pregunta',
    descripcion: `Porcentaje de respuestas correctas en cada pregunta. Por debajo de ${est.UMBRAL_REVISAR}% se marca para revisión:
      puede ser un tema mal comprendido o una pregunta ambigua. ${aRevisar.length
        ? `<strong>${aRevisar.length} ${aRevisar.length === 1 ? 'pregunta requiere' : 'preguntas requieren'} revisión.</strong>` : ''}`,
    grafica: leyenda([['var(--graf-serie)', `Acierto ≥ ${est.UMBRAL_REVISAR}%`], ['var(--estado-revisar)', `Acierto < ${est.UMBRAL_REVISAR}% · revisar`]]) +
      barrasH({ filas, max: 100, marcasEje: [0, 25, 50, 75, 100], sufijo: '%',
        referencia: { valor: est.UMBRAL_REVISAR, texto: `${est.UMBRAL_REVISAR}%` } }),
    pie: tablaDatos({ titulo: 'Ver tabla con la opción incorrecta más elegida',
      columnas: ['Pregunta', 'Respuestas', 'Acierto', 'Opción incorrecta más elegida', 'Validación'],
      numericas: [1, 2],
      filas: pp.map(p => [`M${p.moduloNumero}·P${p.numero} ${esc(p.enunciado)}`, p.respuestas, fmt(p.pctAcierto, '%'),
        p.distractor ? `${p.distractor.letra}. ${esc(p.distractor.opcion)} (${fmt(p.distractor.pct, '%')})` : '—',
        p.estadoValidacion === 'validada' ? 'Validada' : 'Por validar']) })
  });
}

/* ---------- tabla de participantes ---------- */
export function tablaParticipantes(r, { compacta = false } = {}) {
  const umbral = r.curso.notaMinima;
  const celda = n => n === null ? '<span class="pista">—</span>'
    : `<span class="${n >= umbral ? 'nota-ok' : 'nota-baja'}">${n}</span>`;
  return `
  <section class="panel">
    <div class="panel-cab"><h3>Participantes</h3><span class="pista">${r.porParticipante.length} inscritos · mejor nota por módulo</span></div>
    <div class="tabla-env"><table class="tabla-participantes">
      <thead><tr>
        <th>Participante</th>${compacta ? '' : '<th>Entidad</th>'}
        <th class="n">Avance</th>
        ${r.modulos.map(m => `<th class="n" title="${esc(m.titulo)}">M${m.numero}</th>`).join('')}
        <th class="n">Promedio</th><th>Estado</th>
      </tr></thead>
      <tbody>${r.porParticipante.slice().sort((a, b) => b.aprobados - a.aprobados || b.avance - a.avance).map(p => `
        <tr>
          <td><div style="font-weight:600">${esc(p.nombre)}</div>${compacta ? `<div class="pista">${esc(p.entidad)}</div>` : `<div class="pista">${esc(p.correo)}</div>`}</td>
          ${compacta ? '' : `<td>${esc(p.entidad || '—')}</td>`}
          <td class="n">${p.avance}%</td>
          ${p.notas.map(n => `<td class="n">${celda(n)}</td>`).join('')}
          <td class="n">${fmt(p.promedio)}</td>
          <td><span class="pastilla ${p.estado === 'Finalizó' ? 'p-ok' : p.estado === 'En curso' ? 'p-warn' : 'p-idle'}">${p.estado}</span></td>
        </tr>`).join('')}
      </tbody>
    </table></div>
  </section>`;
}

/* ---------- exportar CSV (para análisis en Excel, R o Python) ---------- */
export function descargarCSV(r) {
  const filas = est.filasCSV(r.ix, r.porId);
  const csv = filas.map(f => f.map(v => {
    const s = String(v ?? '');
    return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(';')).join('\r\n');
  // BOM para que Excel reconozca las tildes; punto y coma, separador por defecto en Excel en español
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'resultados-curso-ctei-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return filas.length - 1;
}

export { fmt, fecha };

/* "1 intento", "1,4 intentos" */
function intentosTxt(v) { return `${fmt(v)} ${Number(v) === 1 ? 'intento' : 'intentos'}`; }

/* marcas del eje en números enteros "redondos" (0, 5, 10… o 0, 10, 20…) */
function marcasEnteras(max) {
  const paso = max <= 6 ? 1 : max <= 12 ? 2 : max <= 30 ? 5 : max <= 60 ? 10 : max <= 150 ? 25 : 50;
  const m = [];
  for (let v = 0; v <= max; v += paso) m.push(v);
  return m;
}
