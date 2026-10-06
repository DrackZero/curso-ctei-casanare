/* Revisión de materiales: inventario de infografías, inconsistencias
   detectadas y captura de observaciones del equipo de CTeI. */

import { montarMarco } from '../ui/marco.js';
import * as contenidos from '../datos/contenidos.js';
import * as revisiones from '../datos/revisiones.js';
import { recurso } from '../config.js';
import { esc } from '../ui/componentes.js';
import { notificar } from '../ui/avisos.js';
import { abrirLupa } from '../ui/componentes.js';

const ETIQUETA = {
  'coincide':           { texto: 'Sin novedad',           pastilla: 'p-ok' },
  'numero-no-coincide': { texto: 'Número no coincide',    pastilla: 'p-warn' },
  'compartida':         { texto: 'Compartida entre módulos', pastilla: 'p-warn' },
  'faltante':           { texto: 'Pieza faltante',        pastilla: 'p-crit' }
};

const DECISIONES = [
  ['', 'Sin decidir'],
  ['aceptar', 'Dejar como está'],
  ['corregir-numero', 'Corregir el número impreso en la pieza'],
  ['reasignar', 'Reasignar a otro módulo'],
  ['reemplazar', 'Reemplazar la pieza'],
  ['crear', 'Crear pieza nueva']
];

const u = await montarMarco({ activo: '', exigir: 'admin' });
if (u) pintar();

async function pintar() {
  const cat = await contenidos.materiales();
  const mods = await contenidos.modulos();
  const mats = cat.materiales;
  const revs = revisiones.todas();

  const cuenta = k => mats.filter(m => m.estado === k).length;
  const pendientes = mats.filter(m => m.estado !== 'coincide').length;

  document.getElementById('contenido').innerHTML = `
  <div class="cabecera">
    <div>
      <span class="rotulo">Coordinación del curso</span>
      <h2>Revisión de materiales</h2>
      <p>Inventario de las piezas gráficas del curso, con las inconsistencias detectadas al montarlas en la plataforma. Registre aquí la decisión de cada una y exporte las observaciones para el equipo de desarrollo.</p>
    </div>
    <div style="display:flex;gap:.6rem;flex-wrap:wrap">
      <button class="btn btn-linea" type="button" id="btn-limpiar">Borrar mis observaciones</button>
      <button class="btn" type="button" id="btn-exportar">Exportar observaciones</button>
    </div>
  </div>

  <section class="cifras">
    <div class="cifra"><span class="v">${mats.length}</span><span class="k">Piezas registradas</span></div>
    <div class="cifra"><span class="v">${cuenta('coincide')}</span><span class="k">Sin novedad</span></div>
    <div class="cifra"><span class="v">${cuenta('numero-no-coincide') + cuenta('compartida')}</span><span class="k">Con inconsistencia</span></div>
    <div class="cifra"><span class="v">${cuenta('faltante')}</span><span class="k">Faltantes</span></div>
  </section>

  <div class="panel">
    <div class="panel-cab"><h3>Criterio de asignación aplicado</h3></div>
    <div style="padding:1rem 1.1rem"><p class="pista" style="max-width:80ch">${esc(cat.criterio)}</p></div>
  </div>

  ${pendientes ? `<p class="pista"><strong>${pendientes}</strong> de ${mats.length} piezas requieren decisión del equipo de CTeI.</p>` : ''}

  <section class="rev-lista">
    ${mats.map(m => {
      const et = ETIQUETA[m.estado] || ETIQUETA['coincide'];
      const mod = mods.find(x => x.id === m.moduloAsignado);
      const r = revs[m.id] || {};
      return `<article class="rev-item" style="--mod:${mod ? mod.color : 'var(--gob)'}">
        <div class="rev-img">
          ${m.archivo
            ? `<img src="${recurso(m.archivo)}" alt="${esc(m.titulo)}" data-lupa="${recurso(m.archivo)}">`
            : '<div class="rev-vacio">Sin archivo</div>'}
        </div>
        <div class="rev-datos">
          <div class="rev-top">
            <span class="rotulo" style="color:var(--mod)">${mod ? 'Módulo ' + mod.numero : 'Sin módulo'}</span>
            <span class="pastilla ${et.pastilla}">${et.texto}</span>
          </div>
          <h3>${esc(m.titulo)}</h3>
          <dl class="rev-kv">
            <div><dt>Número impreso en la pieza</dt><dd class="mono">${m.numeroImpreso ?? '—'}</dd></div>
            <div><dt>Módulo en la plataforma</dt><dd class="mono">${mod ? mod.numero : '—'}</dd></div>
            <div><dt>Archivo</dt><dd class="mono">${m.archivo ? esc(m.archivo.split('/').pop()) : '—'}</dd></div>
          </dl>
          ${m.observacion ? `<p class="rev-obs">${esc(m.observacion)}</p>` : ''}

          <div class="rev-form" data-id="${m.id}">
            <div class="campo">
              <label for="d-${m.id}">Decisión</label>
              <select id="d-${m.id}" class="rev-dec">
                ${DECISIONES.map(([v, t]) => `<option value="${v}" ${r.decision === v ? 'selected' : ''}>${t}</option>`).join('')}
              </select>
            </div>
            <div class="campo">
              <label for="o-${m.id}">Observación del revisor</label>
              <textarea id="o-${m.id}" class="rev-txt" rows="2" placeholder="Qué debe corregirse y cómo">${esc(r.observacion || '')}</textarea>
            </div>
            <div class="campo">
              <label for="r-${m.id}">Revisado por</label>
              <input id="r-${m.id}" class="rev-quien" placeholder="Nombre" value="${esc(r.revisadoPor || '')}">
            </div>
            <button class="btn btn-sm" type="button" data-guardar="${m.id}">Guardar</button>
            ${r.fecha ? `<span class="pista mono">guardado ${new Date(r.fecha).toLocaleDateString('es-CO')}</span>` : ''}
          </div>
        </div>
      </article>`;
    }).join('')}
  </section>`;

  conectar(mats);
}

function conectar(mats) {
  document.querySelectorAll('[data-lupa]').forEach(im =>
    im.addEventListener('click', () => abrirLupa(im.dataset.lupa, im.alt)));

  document.querySelectorAll('[data-guardar]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.guardar;
    const caja = b.closest('.rev-form');
    revisiones.guardar(id, {
      decision:   caja.querySelector('.rev-dec').value,
      observacion: caja.querySelector('.rev-txt').value.trim(),
      revisadoPor: caja.querySelector('.rev-quien').value.trim()
    });
    notificar('Observación guardada');
    pintar();
  }));

  document.getElementById('btn-exportar').addEventListener('click', () => {
    const n = revisiones.exportar(mats);
    notificar(n ? `Se exportaron ${n} observaciones` : 'Todavía no hay observaciones registradas');
  });

  document.getElementById('btn-limpiar').addEventListener('click', () => {
    revisiones.limpiar();
    notificar('Observaciones borradas');
    pintar();
  });
}
