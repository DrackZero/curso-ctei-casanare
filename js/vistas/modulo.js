/* Vista de un módulo: infografía, secciones previas y acceso a la evaluación. */

import { montarMarco } from '../ui/marco.js';
import * as contenidos from '../datos/contenidos.js';
import * as almacen from '../datos/almacen.js';
import * as progreso from '../nucleo/progreso.js';
import * as evaluacion from '../nucleo/evaluacion.js';
import { PAGINAS, recurso } from '../config.js';
import { esc, fecha, parametro, abrirLupa } from '../ui/componentes.js';

const id = parametro('m') || 'm1';
let seccionAbierta = null;
let indiceInfo = 0;

const u = await montarMarco({ activo: 'modulo', moduloActivo: id });
if (u) pintar();

async function pintar() {
  const c = await contenidos.curso();
  const secs = c.secciones;
  const m = await contenidos.modulo(id);
  const cont = document.getElementById('contenido');
  if (!m) { cont.innerHTML = '<p class="pista">Módulo no encontrado.</p>'; return; }

  document.documentElement.style.setProperty('--mod', m.color);
  document.documentElement.style.setProperty('--mod-suave', m.colorSuave);
  document.title = 'Módulo ' + m.numero + ' · ' + c.nombreCorto;

  const catalogo = (await contenidos.materiales()).materiales;
  const piezas = m.infografias
    .map(i => ({ ...i, mat: catalogo.find(x => x.id === i.material) }))
    .filter(i => i.mat && i.mat.archivo);

  const av = progreso.avanceModulo(u.id, m.id, secs);
  const listo = av === 100;
  const e = progreso.estadoModulo(u.id, m, secs);
  const nota = evaluacion.mejorNota(u.id, m.id);
  const intentos = almacen.intentosDe(u.id, m.id).slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
  const varias = piezas.length > 1;
  const idx = Math.min(indiceInfo, Math.max(piezas.length - 1, 0));
  const pieza = piezas[idx];

  cont.innerHTML = `
  <section class="mod-cab">
    <div class="cinta"></div>
    <div class="in">
      <div style="min-width:0">
        <span class="num">MÓDULO ${m.numero}</span>
        <h2>${esc(m.titulo)}</h2>
        <div class="mod-meta" style="margin-top:.6rem">
          <span>${esc(m.duracion)}</span><span>Nivel ${esc(m.nivel.toLowerCase())}</span><span>Producto: ${esc(m.producto)}</span>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:.45rem;align-items:flex-end">
        <span class="pastilla ${e.pastilla}">${e.texto}${nota !== null ? ' · ' + nota : ''}</span>
        <span class="pista mono">${progreso.seccionesVistas(u.id, m.id, secs)} de ${secs.length} secciones</span>
      </div>
    </div>
  </section>

  ${pieza ? `
  <section class="info-zona">
    <div class="info-marco">
      ${varias ? '<button class="flecha izq" type="button" data-info="-1" aria-label="Infografía anterior">‹</button>' : ''}
      <img src="${recurso(pieza.mat.archivo)}" alt="${esc(pieza.titulo)}" data-lupa="${recurso(pieza.mat.archivo)}">
      ${varias ? '<button class="flecha der" type="button" data-info="1" aria-label="Infografía siguiente">›</button>' : ''}
    </div>
    <div class="info-pie">
      <span class="tit">${esc(pieza.titulo)}</span>
      ${varias ? `<span class="pista mono">${idx + 1} / ${piezas.length}</span>` : ''}
      <span class="pista">· Haga clic en la imagen para ampliarla</span>
    </div>
    ${varias ? `<div class="miniaturas">${piezas.map((p, i) =>
        `<button type="button" data-mini="${i}" aria-current="${i === idx}" aria-label="Ver infografía ${i + 1}"><img src="${recurso(p.mat.archivo)}" alt=""></button>`).join('')}</div>` : ''}
    ${pieza.mat.estado !== 'coincide' ? `<p class="pista" style="text-align:center;max-width:70ch">
        <strong>Nota de revisión:</strong> ${esc(pieza.mat.observacion)}</p>` : ''}
  </section>` : `
  <section class="info-zona">
    <p class="pista">Este módulo todavía no tiene infografía asignada.</p>
  </section>`}

  <div class="cabecera">
    <div>
      <h2 style="font-size:1.2rem">Antes de presentar la evaluación</h2>
      <p>Revise cada punto. La evaluación calificativa se habilita cuando haya consultado las ${secs.length} secciones.</p>
    </div>
    <span class="barra" style="width:180px"><span style="width:${av}%"></span></span>
  </div>

  <section class="secciones">
    ${secs.map(s => `
      <button class="sec-btn ${progreso.seccionVista(u.id, m.id, s.k) ? 'vista' : ''}" type="button" data-sec="${s.k}" aria-expanded="${seccionAbierta === s.k}">
        <span class="marca">✓</span>
        <span class="txt">${esc(s.t)}<small>${esc(s.d)}</small></span>
      </button>`).join('')}
  </section>

  ${seccionAbierta ? `
  <section class="panel-sec">
    <h3>${esc(secs.find(s => s.k === seccionAbierta).t)}</h3>
    <div class="cuerpo">${cuerpoSeccion(m, seccionAbierta)}</div>
    <div><button class="btn btn-linea btn-sm" type="button" id="cerrar-sec">Cerrar</button></div>
  </section>` : ''}

  <section class="caja-eval">
    <div class="txt">
      <h3>Evaluación calificativa del módulo ${m.numero}</h3>
      <p class="pista">Preguntas de selección múltiple · se aprueba con ${c.notaMinima} puntos · intentos ilimitados.
      ${listo ? '' : ' <strong>Consulte todas las secciones para habilitarla.</strong>'}</p>
    </div>
    <div style="display:flex;gap:.6rem;flex-wrap:wrap;align-items:center">
      ${nota !== null ? `<span class="pista">Mejor nota: <strong class="mono">${nota}</strong></span>` : ''}
      ${listo
        ? `<a class="btn btn-mod" href="${PAGINAS.evaluacion}?m=${m.id}">${intentos.length ? 'Repetir evaluación' : 'Presentar evaluación'}</a>`
        : '<button class="btn btn-mod" type="button" disabled>Presentar evaluación</button>'}
    </div>
  </section>

  ${intentos.length ? `
  <section class="panel">
    <div class="panel-cab"><h3>Intentos registrados</h3></div>
    <div class="tabla-env"><table>
      <thead><tr><th>Intento</th><th>Fecha</th><th>Aciertos</th><th>Nota</th><th>Resultado</th></tr></thead>
      <tbody>${intentos.map((a, i) => `<tr>
        <td class="n">${intentos.length - i}</td><td>${fecha(a.fecha)}</td>
        <td class="n">${a.correctas}/${a.total}</td><td class="n">${a.nota}</td>
        <td><span class="pastilla ${a.nota >= c.notaMinima ? 'p-ok' : 'p-crit'}">${a.nota >= c.notaMinima ? 'Aprobado' : 'No aprobado'}</span></td></tr>`).join('')}
      </tbody>
    </table></div>
  </section>` : ''}`;

  conectar(m);
}

function cuerpoSeccion(m, k) {
  if (k === 'proposito')   return `<p>${esc(m.proposito)}</p>`;
  if (k === 'competencia') return `<p>${esc(m.competencia)}</p>`;
  if (k === 'resultados')  return `<p style="margin-bottom:.5rem">Al terminar el módulo, el participante:</p><ol>${m.resultados.map(r => `<li>${esc(r)}</li>`).join('')}</ol>`;
  if (k === 'contenidos')  return `<ol>${m.contenidos.map(c => `<li>${esc(c)}</li>`).join('')}</ol>`;
  if (k === 'recursos')    return `<ul>${m.recursos.map(r => `<li>${esc(r)}</li>`).join('')}</ul><p class="nota-pie">Los archivos descargables se habilitan al cargar los materiales definitivos del curso.</p>`;
  if (k === 'actividad')   return `<p>${esc(m.actividad)}</p><p style="margin-top:.6rem"><strong>Evaluación formativa:</strong> ${esc(m.formativa)}</p>`;
  if (k === 'producto')    return `<p><strong>${esc(m.producto)}</strong></p><p style="margin-top:.6rem"><strong>Conexión con el siguiente módulo:</strong> ${esc(m.conexion)}</p>`;
  return '';
}

function conectar(m) {
  document.querySelectorAll('[data-sec]').forEach(b => b.addEventListener('click', async () => {
    const k = b.dataset.sec;
    await almacen.marcarSeccion(u.id, m.id, k);
    seccionAbierta = seccionAbierta === k ? null : k;
    await pintar();
    const p = document.querySelector('.panel-sec');
    if (p) p.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }));
  const cs = document.getElementById('cerrar-sec');
  if (cs) cs.addEventListener('click', () => { seccionAbierta = null; pintar(); });

  document.querySelectorAll('[data-info]').forEach(b => b.addEventListener('click', async () => {
    const total = (await contenidos.modulo(m.id)).infografias.length;
    indiceInfo = (indiceInfo + Number(b.dataset.info) + total) % total;
    pintar();
  }));
  document.querySelectorAll('[data-mini]').forEach(b => b.addEventListener('click', () => {
    indiceInfo = Number(b.dataset.mini); pintar();
  }));
  document.querySelectorAll('[data-lupa]').forEach(im => im.addEventListener('click', () => abrirLupa(im.dataset.lupa, im.alt)));
}
