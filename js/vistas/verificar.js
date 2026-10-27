/* Verificación pública de constancias: cualquiera, sin iniciar sesión,
   comprueba con el código si una constancia es auténtica. */

import '../ui/carga.js';
import * as almacen from '../datos/almacen.js';
import { PAGINAS, recurso } from '../config.js';
import { esc } from '../ui/componentes.js';

const raiz = document.getElementById('informe');
const inicial = new URLSearchParams(location.search).get('c') || '';
pintar(inicial);
if (inicial) consultar(inicial);

function pintar(codigo, resultado = '') {
  raiz.innerHTML = `
  <div class="ver-cab">
    <img src="${recurso('assets/img/marca/escudo-casanare.png')}" alt="">
    <div><strong>Gobernación de Casanare</strong><div class="pista">Curso Innovación pública y proyectos CTeI</div></div>
  </div>
  <section class="ver-tarjeta">
    <h1 style="font-size:1.35rem;margin:0">Verificar una constancia</h1>
    <p class="pista" style="margin:0">Escriba el código que aparece debajo del QR de la constancia, por ejemplo <span class="mono">A7B8-18F6-E826</span>.</p>
    <form class="ver-form" id="ver-form">
      <input name="codigo" aria-label="Código de la constancia" value="${esc(codigo)}" maxlength="20" autocomplete="off" required placeholder="XXXX-XXXX-XXXX">
      <button class="btn" type="submit">Verificar</button>
    </form>
    <div id="ver-resultado" role="status">${resultado}</div>
  </section>
  <p class="pista"><a href="${PAGINAS.acceso}">Ir al aula virtual</a></p>`;
  document.getElementById('ver-form').addEventListener('submit', e => {
    e.preventDefault();
    const c = e.target.codigo.value.trim();
    history.replaceState(null, '', '?c=' + encodeURIComponent(c));
    consultar(c);
  });
}

async function consultar(codigo) {
  const caja = document.getElementById('ver-resultado');
  caja.innerHTML = '<p class="pista">Consultando…</p>';
  let r;
  try { r = await almacen.verificarConstancia(codigo); } catch (e) { r = { ok: false }; }
  if (!r.ok) { caja.innerHTML = '<div class="ver-mal">No fue posible consultar en este momento. Inténtelo de nuevo.</div>'; return; }
  const c = r.constancia;
  caja.innerHTML = c ? `
    <div class="ver-ok"><strong>Constancia auténtica.</strong>
      <dl><dt>Nombre</dt><dd>${esc(c.nombre)}</dd>
          <dt>Promedio</dt><dd>${c.promedio} sobre 100</dd>
          <dt>Expedida</dt><dd>${new Date(c.emitida).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</dd>
          <dt>Código</dt><dd class="mono">${esc(c.codigo)}</dd></dl></div>`
    : `<div class="ver-mal"><strong>No existe una constancia con ese código.</strong> Revise que esté escrito completo, con los guiones.</div>`;
}
