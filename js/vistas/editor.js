/* Editor de contenidos de la coordinación: preguntas, textos de los módulos,
   materiales (imágenes y PDF) e historial de cambios.
   Todo se guarda en Supabase; las reglas del servidor impiden que alguien
   que no sea coordinación escriba, aunque manipule esta página. */

import { montarMarco } from '../ui/marco.js';
import * as almacen from '../datos/almacen.js';
import * as contenidos from '../datos/contenidos.js';
import { recurso } from '../config.js';
import { esc, fecha } from '../ui/componentes.js';
import { notificar } from '../ui/avisos.js';

const u = await montarMarco({ activo: '', exigir: 'admin' });

const LETRAS = 'ABCDEF';
const TIPOS = { infografia: 'Infografía (imagen)', documento: 'Documento descargable (PDF o imagen)' };
const ACEPTA = 'image/jpeg,image/png,image/webp,application/pdf';
const MAX_MB = 20;

const estado = {
  pestana: 'preguntas',
  modulo: 'm1',
  sucio: false,        // hay cambios sin guardar en la pestaña actual
  preguntas: null,     // documento de preguntas del módulo, con respuestas correctas
  modulos: null,       // documento completo de módulos
  materiales: null     // catálogo de materiales
};

const copia = x => JSON.parse(JSON.stringify(x));

window.addEventListener('beforeunload', e => { if (estado.sucio) { e.preventDefault(); e.returnValue = ''; } });

if (u) {
  await cargar();
  pintar();
}

async function cargar() {
  contenidos.olvidar();
  estado.modulos = copia(await contenidos.documentoModulos());
  estado.materiales = copia(await contenidos.materiales());
  if (!estado.modulos.modulos.some(m => m.id === estado.modulo)) estado.modulo = estado.modulos.modulos[0].id;
  await cargarPreguntas();
  estado.sucio = false;
}

async function cargarPreguntas() {
  const doc = copia(await contenidos.documentoPreguntas(estado.modulo));
  const claves = almacen.claves()[estado.modulo] || [];
  doc.preguntas.forEach((q, i) => {
    q.correcta = claves[i] ? claves[i].correcta : null;
    q.retroalimentacion = claves[i] ? claves[i].retroalimentacion : '';
  });
  estado.preguntas = doc;
}

function confirmarDescarte() {
  return !estado.sucio || confirm('Hay cambios sin guardar. ¿Desea descartarlos?');
}

/* ------------------------------------------------------------------ marco */
function pintar() {
  const raiz = document.getElementById('contenido');
  const pest = [['preguntas', 'Preguntas'], ['modulos', 'Módulos'], ['materiales', 'Materiales'], ['historial', 'Historial']];
  raiz.innerHTML = `
  <div class="cabecera">
    <div>
      <span class="rotulo">Coordinación del curso</span>
      <h2>Editor de contenidos</h2>
      <p>Los cambios se publican para todos los participantes al pulsar <strong>Guardar</strong>. Cada versión anterior queda en el historial.</p>
    </div>
  </div>
  <div class="pestanas ed-pestanas" role="tablist">
    ${pest.map(([k, t]) => `<button type="button" role="tab" aria-selected="${estado.pestana === k}" data-pestana="${k}">${t}</button>`).join('')}
  </div>
  <div id="ed-cuerpo"></div>`;

  raiz.querySelectorAll('[data-pestana]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.pestana === estado.pestana || !confirmarDescarte()) return;
    descartar().then(() => { estado.pestana = b.dataset.pestana; pintar(); });
  }));

  ({ preguntas: pintarPreguntas, modulos: pintarModulos, materiales: pintarMateriales, historial: pintarHistorial })[estado.pestana]();
}

async function descartar() {
  if (estado.sucio) await cargar();
}

function selectorModulo() {
  return `<label class="ed-selector">Módulo
    <select id="ed-modulo">${estado.modulos.modulos.map(m =>
      `<option value="${m.id}" ${m.id === estado.modulo ? 'selected' : ''}>${m.numero}. ${esc(m.titulo)}</option>`).join('')}</select>
  </label>`;
}

function conectarSelectorModulo(alCambiar) {
  const s = document.getElementById('ed-modulo');
  s.addEventListener('change', async () => {
    if (!confirmarDescarte()) { s.value = estado.modulo; return; }
    if (estado.sucio) await cargar();
    estado.modulo = s.value;
    await alCambiar();
  });
}

function barraGuardar(texto = 'Guardar cambios') {
  return `<div class="ed-guardar">
    <span class="pista" id="ed-estado">${estado.sucio ? 'Hay cambios sin guardar.' : 'Sin cambios pendientes.'}</span>
    <button class="btn" type="button" id="ed-guardar">${texto}</button>
  </div>`;
}

function marcarSucio() {
  estado.sucio = true;
  const e = document.getElementById('ed-estado');
  if (e) e.textContent = 'Hay cambios sin guardar.';
}

/* Enlaza inputs con data-ruta="a.b.0.c" al objeto raíz. */
function enlazar(cuerpo, raizDatos) {
  cuerpo.querySelectorAll('[data-ruta]').forEach(el => el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input', () => {
    const partes = el.dataset.ruta.split('.');
    let o = raizDatos;
    for (const p of partes.slice(0, -1)) o = o[p];
    const ult = partes[partes.length - 1];
    if (el.type === 'checkbox') o[ult] = el.checked;
    else if (el.dataset.lista !== undefined) o[ult] = el.value.split('\n').map(s => s.trim()).filter(Boolean);
    else o[ult] = el.value;
    marcarSucio();
  }));
}

async function conBoton(boton, tarea) {
  const t = boton.textContent;
  boton.disabled = true; boton.textContent = 'Guardando…';
  try { return await tarea(); } finally { boton.disabled = false; boton.textContent = t; }
}

/* ------------------------------------------------------------------ preguntas */
function pintarPreguntas() {
  const doc = estado.preguntas;
  const c = document.getElementById('ed-cuerpo');
  c.innerHTML = `
  <div class="ed-barra">${selectorModulo()}
    <label class="ed-selector">Preguntas por intento
      <input type="number" id="ed-por-intento" min="1" max="${doc.preguntas.length}" value="${Math.min(doc.preguntas.length, Number(doc.preguntasPorIntento) || doc.preguntas.length)}" style="width:5rem">
      <span class="pista">de ${doc.preguntas.length} en el banco · se eligen al azar</span>
    </label>
  </div>
  <p class="pista" style="margin:-.4rem 0 1rem">La respuesta correcta nunca se envía a los participantes antes de calificar.</p>
  ${doc.preguntas.map((q, i) => `
  <section class="panel ed-tarjeta">
    <div class="panel-cab">
      <h3>Pregunta ${i + 1}</h3>
      <span class="ed-acciones">
        <button type="button" class="btn btn-sutil btn-sm" data-mover="${i}:-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir pregunta ${i + 1}">↑</button>
        <button type="button" class="btn btn-sutil btn-sm" data-mover="${i}:1" ${i === doc.preguntas.length - 1 ? 'disabled' : ''} aria-label="Bajar pregunta ${i + 1}">↓</button>
        <button type="button" class="btn btn-sutil btn-sm ed-peligro" data-borrar-preg="${i}">Eliminar</button>
      </span>
    </div>
    <div class="campo"><label>Enunciado</label><textarea rows="2" data-ruta="preguntas.${i}.enunciado">${esc(q.enunciado || '')}</textarea></div>
    <fieldset class="ed-opciones">
      <legend>Opciones · marque la correcta</legend>
      ${q.opciones.map((op, j) => `
      <div class="ed-opcion ${q.correcta === j ? 'correcta' : ''}">
        <label class="ed-radio"><input type="radio" name="correcta-${i}" data-correcta="${i}:${j}" ${q.correcta === j ? 'checked' : ''}> ${LETRAS[j]}</label>
        <input data-ruta="preguntas.${i}.opciones.${j}" value="${esc(op)}" aria-label="Opción ${LETRAS[j]}">
        <button type="button" class="btn btn-sutil btn-sm" data-borrar-op="${i}:${j}" ${q.opciones.length <= 2 ? 'disabled' : ''} aria-label="Quitar opción ${LETRAS[j]}">✕</button>
      </div>`).join('')}
      ${q.opciones.length < 6 ? `<button type="button" class="btn btn-linea btn-sm" data-agregar-op="${i}">+ Agregar opción</button>` : ''}
      ${q.correcta === null || q.correcta === undefined ? '<p class="err">Falta marcar la respuesta correcta.</p>' : ''}
    </fieldset>
    <div class="campo"><label>Retroalimentación (se muestra después de calificar)</label><textarea rows="2" data-ruta="preguntas.${i}.retroalimentacion">${esc(q.retroalimentacion || '')}</textarea></div>
    <div class="ed-fila">
      <div class="campo"><label>Validación</label>
        <select data-ruta="preguntas.${i}.estado">
          <option value="por-validar" ${q.estado !== 'validada' ? 'selected' : ''}>Por validar</option>
          <option value="validada" ${q.estado === 'validada' ? 'selected' : ''}>Validada</option>
        </select></div>
      <div class="campo"><label>Validada por</label><input data-ruta="preguntas.${i}.validadoPor" value="${esc(q.validadoPor || '')}"></div>
      <div class="campo"><label>Observación</label><input data-ruta="preguntas.${i}.observacion" value="${esc(q.observacion || '')}"></div>
    </div>
  </section>`).join('')}
  <button type="button" class="btn btn-linea" id="ed-agregar-preg">+ Agregar pregunta</button>
  ${barraGuardar('Guardar preguntas')}`;

  conectarSelectorModulo(async () => { await cargarPreguntas(); pintarPreguntas(); });
  enlazar(c, doc);
  document.getElementById('ed-por-intento').addEventListener('input', e => {
    doc.preguntasPorIntento = Number(e.target.value) || doc.preguntas.length;
    marcarSucio();
  });

  const rehacer = f => () => { f(); marcarSucio(); pintarPreguntas(); };
  c.querySelectorAll('[data-correcta]').forEach(r => r.addEventListener('change', rehacer(() => {
    const [i, j] = r.dataset.correcta.split(':').map(Number); doc.preguntas[i].correcta = j;
  })));
  c.querySelectorAll('[data-agregar-op]').forEach(b => b.addEventListener('click', rehacer(() => {
    doc.preguntas[Number(b.dataset.agregarOp)].opciones.push('');
  })));
  c.querySelectorAll('[data-borrar-op]').forEach(b => b.addEventListener('click', rehacer(() => {
    const [i, j] = b.dataset.borrarOp.split(':').map(Number);
    const q = doc.preguntas[i];
    q.opciones.splice(j, 1);
    if (q.correcta === j) q.correcta = null; else if (q.correcta > j) q.correcta--;
  })));
  c.querySelectorAll('[data-mover]').forEach(b => b.addEventListener('click', rehacer(() => {
    const [i, d] = b.dataset.mover.split(':').map(Number);
    [doc.preguntas[i], doc.preguntas[i + d]] = [doc.preguntas[i + d], doc.preguntas[i]];
  })));
  c.querySelectorAll('[data-borrar-preg]').forEach(b => b.addEventListener('click', () => {
    if (doc.preguntas.length === 1) { notificar('El módulo debe conservar al menos una pregunta'); return; }
    if (!confirm('¿Eliminar la pregunta ' + (Number(b.dataset.borrarPreg) + 1) + '?')) return;
    rehacer(() => doc.preguntas.splice(Number(b.dataset.borrarPreg), 1))();
  }));
  document.getElementById('ed-agregar-preg').addEventListener('click', rehacer(() => {
    doc.preguntas.push({ id: estado.modulo + '-p' + Date.now(), enunciado: '', opciones: ['', '', '', ''],
      correcta: null, retroalimentacion: '', estado: 'por-validar', validadoPor: '', observacion: '' });
  }));

  document.getElementById('ed-guardar').addEventListener('click', e => conBoton(e.currentTarget, async () => {
    const problema = revisarPreguntas(doc.preguntas);
    if (problema) { alert(problema); return; }
    const por = Number(doc.preguntasPorIntento) || doc.preguntas.length;
    if (por < 1 || por > doc.preguntas.length) {
      alert(`«Preguntas por intento» debe estar entre 1 y ${doc.preguntas.length}.`); return;
    }
    doc.preguntasPorIntento = por;
    doc.preguntas.forEach(q => { q.enunciado = q.enunciado.trim(); q.opciones = q.opciones.map(o => o.trim()); });
    doc.actualizado = new Date().toISOString().slice(0, 10);
    const r = await almacen.guardarPreguntas(estado.modulo, doc);
    if (!r.ok) { alert('No se pudo guardar: ' + r.error); return; }
    estado.sucio = false; contenidos.olvidar();
    notificar('Preguntas guardadas y publicadas');
    pintarPreguntas();
  }));
}

function revisarPreguntas(lista) {
  for (const [i, q] of lista.entries()) {
    const n = i + 1;
    if (!String(q.enunciado || '').trim()) return `La pregunta ${n} no tiene enunciado.`;
    if (q.opciones.some(o => !String(o).trim())) return `La pregunta ${n} tiene una opción vacía. Escríbala o quítela.`;
    if (new Set(q.opciones.map(o => o.trim().toLowerCase())).size !== q.opciones.length) return `La pregunta ${n} tiene opciones repetidas.`;
    if (q.correcta === null || q.correcta === undefined) return `Marque la respuesta correcta de la pregunta ${n}.`;
  }
  return null;
}

/* ------------------------------------------------------------------ módulos */
function pintarModulos() {
  const i = estado.modulos.modulos.findIndex(m => m.id === estado.modulo);
  const m = estado.modulos.modulos[i];
  m.infografias ||= []; m.documentos ||= [];
  const R = k => `modulos.${i}.${k}`;
  const mats = estado.materiales.materiales;
  const texto = (k, t, filas = 3) => `<div class="campo"><label>${t}</label><textarea rows="${filas}" data-ruta="${R(k)}">${esc(m[k] || '')}</textarea></div>`;
  const lista = (k, t) => `<div class="campo"><label>${t} <span class="pista">(uno por línea)</span></label><textarea rows="5" data-lista data-ruta="${R(k)}">${esc((m[k] || []).join('\n'))}</textarea></div>`;
  const piezas = (k, tipo, titulo) => `
    <fieldset class="ed-opciones">
      <legend>${titulo}</legend>
      ${m[k].map((p, j) => `
      <div class="ed-opcion">
        <select data-ruta="${R(k)}.${j}.material" aria-label="Material">
          ${mats.filter(x => x.tipo === tipo || x.id === p.material).map(x =>
            `<option value="${esc(x.id)}" ${x.id === p.material ? 'selected' : ''}>${esc(x.titulo)}${x.archivo ? '' : ' (sin archivo)'}</option>`).join('')}
        </select>
        <input data-ruta="${R(k)}.${j}.titulo" value="${esc(p.titulo || '')}" placeholder="Título visible" aria-label="Título visible">
        <button type="button" class="btn btn-sutil btn-sm" data-pieza-mover="${k}:${j}:-1" ${j === 0 ? 'disabled' : ''} aria-label="Subir">↑</button>
        <button type="button" class="btn btn-sutil btn-sm" data-pieza-quitar="${k}:${j}" aria-label="Quitar">✕</button>
      </div>`).join('') || '<p class="pista">Ninguno asignado.</p>'}
      ${mats.some(x => x.tipo === tipo) ? `<button type="button" class="btn btn-linea btn-sm" data-pieza-agregar="${k}:${tipo}">+ Asignar</button>`
        : `<p class="pista">Primero suba el archivo en la pestaña Materiales.</p>`}
    </fieldset>`;

  const c = document.getElementById('ed-cuerpo');
  c.innerHTML = `
  <div class="ed-barra">${selectorModulo()}
    <label class="ed-check"><input type="checkbox" data-ruta="${R('publicado')}" ${m.publicado !== false ? 'checked' : ''}> Publicado (visible para los participantes)</label>
  </div>
  <section class="panel ed-tarjeta">
    <div class="campo"><label>Título</label><input data-ruta="${R('titulo')}" value="${esc(m.titulo || '')}"></div>
    <div class="ed-fila">
      <div class="campo"><label>Duración</label><input data-ruta="${R('duracion')}" value="${esc(m.duracion || '')}"></div>
      <div class="campo"><label>Nivel</label><input data-ruta="${R('nivel')}" value="${esc(m.nivel || '')}"></div>
      <div class="campo"><label>Producto</label><input data-ruta="${R('producto')}" value="${esc(m.producto || '')}"></div>
    </div>
    ${texto('proposito', 'Propósito formativo')}
    ${texto('competencia', 'Competencia específica')}
    ${lista('resultados', 'Resultados de aprendizaje')}
    ${lista('contenidos', 'Unidades y contenidos')}
    ${lista('recursos', 'Materiales de apoyo (texto)')}
    ${texto('actividad', 'Actividad práctica')}
    ${texto('formativa', 'Evaluación formativa', 2)}
    ${texto('conexion', 'Conexión con el siguiente módulo', 2)}
    ${piezas('infografias', 'infografia', 'Infografías del módulo (en el orden en que se muestran)')}
    ${piezas('documentos', 'documento', 'Documentos descargables (aparecen en «Materiales de apoyo»)')}
  </section>
  ${barraGuardar('Guardar módulo')}`;

  conectarSelectorModulo(async () => pintarModulos());
  enlazar(c, estado.modulos);

  const rehacer = f => () => { f(); marcarSucio(); pintarModulos(); };
  c.querySelectorAll('[data-pieza-agregar]').forEach(b => b.addEventListener('click', rehacer(() => {
    const [k, tipo] = b.dataset.piezaAgregar.split(':');
    const x = mats.find(y => y.tipo === tipo);
    m[k].push({ material: x.id, titulo: x.titulo });
  })));
  c.querySelectorAll('[data-pieza-quitar]').forEach(b => b.addEventListener('click', rehacer(() => {
    const [k, j] = b.dataset.piezaQuitar.split(':'); m[k].splice(Number(j), 1);
  })));
  c.querySelectorAll('[data-pieza-mover]').forEach(b => b.addEventListener('click', rehacer(() => {
    const [k, j] = b.dataset.piezaMover.split(':'); const a = Number(j);
    [m[k][a - 1], m[k][a]] = [m[k][a], m[k][a - 1]];
  })));

  document.getElementById('ed-guardar').addEventListener('click', e => conBoton(e.currentTarget, async () => {
    if (!String(m.titulo || '').trim()) { alert('El módulo necesita un título.'); return; }
    if (!estado.modulos.modulos.some(x => x.publicado !== false)) { alert('Debe quedar al menos un módulo publicado.'); return; }
    await guardarModulos('Módulo guardado y publicado');
    pintarModulos();
  }));
}

async function guardarModulos(mensaje) {
  estado.modulos.actualizado = new Date().toISOString().slice(0, 10);
  const r = await almacen.guardarContenido('modulos', estado.modulos);
  if (!r.ok) { alert('No se pudo guardar: ' + r.error); return false; }
  estado.sucio = false; contenidos.olvidar();
  if (mensaje) notificar(mensaje);
  return true;
}

async function guardarMateriales(mensaje) {
  estado.materiales.actualizado = new Date().toISOString().slice(0, 10);
  const r = await almacen.guardarContenido('materiales', estado.materiales);
  if (!r.ok) { alert('No se pudo guardar: ' + r.error); return false; }
  estado.sucio = false; contenidos.olvidar();
  if (mensaje) notificar(mensaje);
  return true;
}

/* ------------------------------------------------------------------ materiales */
function usos(id) {
  return estado.modulos.modulos.filter(m => [...(m.infografias || []), ...(m.documentos || [])].some(p => p.material === id));
}

function vistaPrevia(x) {
  if (!x.archivo) return '<span class="ed-mini vacio">Sin archivo</span>';
  if (/\.pdf($|\?)/i.test(x.archivo)) return `<a class="ed-mini pdf" href="${esc(recurso(x.archivo))}" target="_blank" rel="noopener">PDF</a>`;
  return `<img class="ed-mini" src="${esc(recurso(x.archivo))}" alt="">`;
}

function pintarMateriales() {
  const doc = estado.materiales;
  const estados = Object.keys(doc.estados || { coincide: '' });
  const opcionesModulo = sel => estado.modulos.modulos.map(m =>
    `<option value="${m.id}" ${m.id === sel ? 'selected' : ''}>Módulo ${m.numero}</option>`).join('');
  const c = document.getElementById('ed-cuerpo');
  c.innerHTML = `
  <section class="panel ed-tarjeta">
    <div class="panel-cab"><h3>Subir material nuevo</h3><span class="pista">JPG, PNG, WEBP o PDF · máximo ${MAX_MB} MB</span></div>
    <div class="ed-fila">
      <div class="campo"><label for="nuevo-archivo">Archivo</label><input id="nuevo-archivo" type="file" accept="${ACEPTA}"></div>
      <div class="campo"><label for="nuevo-titulo">Título</label><input id="nuevo-titulo" placeholder="Nombre que verán los participantes"></div>
    </div>
    <div class="ed-fila">
      <div class="campo"><label for="nuevo-tipo">Tipo</label><select id="nuevo-tipo">${Object.entries(TIPOS).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></div>
      <div class="campo"><label for="nuevo-modulo">Módulo</label><select id="nuevo-modulo">${opcionesModulo(estado.modulo)}</select></div>
    </div>
    <label class="ed-check"><input type="checkbox" id="nuevo-asignar" checked> Mostrarlo de una vez en ese módulo</label>
    <div><button class="btn" type="button" id="btn-subir">Subir y publicar</button></div>
  </section>

  <section class="panel">
    <div class="panel-cab"><h3>Catálogo</h3><span class="pista">${doc.materiales.length} materiales</span></div>
    <div class="tabla-env"><table class="ed-tabla">
      <thead><tr><th>Vista</th><th>Título</th><th>Tipo</th><th>Módulo</th><th>Estado de revisión</th><th>Se usa en</th><th></th></tr></thead>
      <tbody>${doc.materiales.map((x, i) => `
        <tr>
          <td>${vistaPrevia(x)}</td>
          <td><input data-ruta="materiales.${i}.titulo" value="${esc(x.titulo || '')}" aria-label="Título"></td>
          <td><select data-ruta="materiales.${i}.tipo" aria-label="Tipo">${Object.keys(TIPOS).map(k => `<option value="${k}" ${x.tipo === k ? 'selected' : ''}>${k === 'infografia' ? 'Infografía' : 'Documento'}</option>`).join('')}</select></td>
          <td><select data-ruta="materiales.${i}.moduloAsignado" aria-label="Módulo">${opcionesModulo(x.moduloAsignado)}</select></td>
          <td><select data-ruta="materiales.${i}.estado" aria-label="Estado">${estados.map(k => `<option value="${k}" ${x.estado === k ? 'selected' : ''}>${k}</option>`).join('')}</select></td>
          <td class="pista">${usos(x.id).map(m => 'M' + m.numero).join(', ') || '—'}</td>
          <td class="ed-acciones">
            <label class="btn btn-sutil btn-sm">Reemplazar<input type="file" accept="${ACEPTA}" data-reemplazar="${i}" hidden></label>
            <button type="button" class="btn btn-sutil btn-sm ed-peligro" data-borrar-mat="${i}">Eliminar</button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table></div>
  </section>
  ${barraGuardar('Guardar catálogo')}`;

  enlazar(c, doc);

  const validar = f => {
    if (!f) return 'Seleccione un archivo.';
    if (!ACEPTA.split(',').includes(f.type)) return 'Tipo de archivo no permitido. Use JPG, PNG, WEBP o PDF.';
    if (f.size > MAX_MB * 1024 * 1024) return `El archivo pesa más de ${MAX_MB} MB.`;
    return null;
  };

  document.getElementById('btn-subir').addEventListener('click', e => {
    if (!confirmarDescarte()) return;
    conBoton(e.currentTarget, async () => {
      const f = document.getElementById('nuevo-archivo').files[0];
      const titulo = document.getElementById('nuevo-titulo').value.trim();
      const tipo = document.getElementById('nuevo-tipo').value;
      const modulo = document.getElementById('nuevo-modulo').value;
      const mal = validar(f) || (!titulo && 'Escriba el título del material.');
      if (mal) { alert(mal); return; }
      if (estado.sucio) await cargar();
      const r = await almacen.subirArchivo(f, modulo);
      if (!r.ok) { alert('No se pudo subir el archivo: ' + r.error); return; }
      const id = 'mat-' + Date.now();
      estado.materiales.materiales.push({ id, tipo, archivo: r.url, titulo, numeroImpreso: null, moduloAsignado: modulo,
        criterioAsignacion: 'tema', estado: 'coincide', observacion: '', revisadoPor: '', fechaRevision: '' });
      if (!await guardarMateriales()) return;
      if (document.getElementById('nuevo-asignar').checked) {
        const m = estado.modulos.modulos.find(x => x.id === modulo);
        const k = tipo === 'infografia' ? 'infografias' : 'documentos';
        (m[k] ||= []).push({ material: id, titulo });
        if (!await guardarModulos()) return;
      }
      notificar('Material subido y publicado');
      pintarMateriales();
    });
  });

  c.querySelectorAll('[data-reemplazar]').forEach(inp => inp.addEventListener('change', async () => {
    const x = doc.materiales[Number(inp.dataset.reemplazar)];
    const f = inp.files[0];
    const mal = validar(f);
    if (mal) { alert(mal); return; }
    if (!confirm(`¿Reemplazar el archivo de «${x.titulo}»? Se verá el nuevo en todos los módulos donde se usa.`)) return;
    const r = await almacen.subirArchivo(f, x.moduloAsignado || 'general');
    if (!r.ok) { alert('No se pudo subir el archivo: ' + r.error); return; }
    const anterior = x.archivo;
    x.archivo = r.url;
    if (await guardarMateriales('Archivo reemplazado')) await almacen.borrarArchivo(anterior);
    pintarMateriales();
  }));

  c.querySelectorAll('[data-borrar-mat]').forEach(b => b.addEventListener('click', async () => {
    if (!confirmarDescarte()) return;
    if (estado.sucio) await cargar();
    const i = Number(b.dataset.borrarMat);
    const x = estado.materiales.materiales[i];
    const en = usos(x.id);
    const aviso = en.length ? `\n\nSe quitará también de: ${en.map(m => 'Módulo ' + m.numero).join(', ')}.` : '';
    if (!confirm(`¿Eliminar «${x.titulo}»?${aviso}`)) return;
    if (en.length) {
      en.forEach(m => { m.infografias = (m.infografias || []).filter(p => p.material !== x.id); m.documentos = (m.documentos || []).filter(p => p.material !== x.id); });
      if (!await guardarModulos()) return;
    }
    estado.materiales.materiales.splice(i, 1);
    if (await guardarMateriales('Material eliminado')) await almacen.borrarArchivo(x.archivo);
    pintarMateriales();
  }));

  document.getElementById('ed-guardar').addEventListener('click', e => conBoton(e.currentTarget, async () => {
    if (doc.materiales.some(x => !String(x.titulo || '').trim())) { alert('Todos los materiales necesitan un título.'); return; }
    await guardarMateriales('Catálogo guardado');
    pintarMateriales();
  }));
}

/* ------------------------------------------------------------------ historial */
async function pintarHistorial() {
  const c = document.getElementById('ed-cuerpo');
  c.innerHTML = '<p class="pista">Cargando…</p>';
  const filas = await almacen.historialContenido(40);
  const nombre = id => (almacen.usuarios().find(x => x.id === id) || {}).nombre || '—';
  const que = k => k === 'modulos' ? 'Módulos' : k === 'materiales' ? 'Materiales' : k === 'curso' ? 'Curso'
    : 'Preguntas del módulo ' + k.replace('preguntas:m', '');
  c.innerHTML = `
  <section class="panel">
    <div class="panel-cab"><h3>Versiones anteriores</h3><span class="pista">Cada vez que se guarda, la versión previa queda aquí</span></div>
    ${filas.length ? `<div class="tabla-env"><table>
      <thead><tr><th>Contenido</th><th>Reemplazada el</th><th>Por</th><th></th></tr></thead>
      <tbody>${filas.map(f => `<tr>
        <td>${esc(que(f.clave))}</td>
        <td>${fecha(f.guardado)} · ${new Date(f.guardado).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</td>
        <td>${esc(nombre(f.guardado_por))}</td>
        <td>${f.clave.startsWith('preguntas:')
          ? '<span class="pista">Las preguntas se corrigen desde su pestaña</span>'
          : `<button type="button" class="btn btn-sutil btn-sm" data-restaurar="${f.id}">Restaurar esta versión</button>`}</td>
      </tr>`).join('')}</tbody>
    </table></div>` : '<p class="pista" style="padding:1rem">Todavía no hay cambios registrados.</p>'}
  </section>`;

  c.querySelectorAll('[data-restaurar]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('¿Restaurar esta versión? La actual quedará también en el historial.')) return;
    const v = await almacen.versionContenido(Number(b.dataset.restaurar));
    if (!v) { alert('No se encontró esa versión.'); return; }
    const r = await almacen.guardarContenido(v.clave, v.datos);
    if (!r.ok) { alert('No se pudo restaurar: ' + r.error); return; }
    await cargar();
    notificar('Versión restaurada');
    pintarHistorial();
  }));
}
