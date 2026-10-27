/* Constancia de finalización del curso, lista para guardar en PDF.
   La emite el servidor solo si el participante aprobó todos los módulos;
   el código y el QR permiten verificarla en paginas/verificar.html. */

import '../ui/carga.js';
import * as almacen from '../datos/almacen.js';
import * as contenidos from '../datos/contenidos.js';
import * as sesion from '../nucleo/sesion.js';
import { PAGINAS, recurso } from '../config.js';
import { esc } from '../ui/componentes.js';

await almacen.iniciar();
const u = sesion.exigirSesion();
if (u) await pintar();

async function pintar() {
  const raiz = document.getElementById('informe');
  const c = await contenidos.curso();
  const muestra = u.rol === 'admin' && new URLSearchParams(location.search).has('muestra');
  document.getElementById('volver').href = PAGINAS.notas;
  document.getElementById('btn-pdf').addEventListener('click', () => window.print());

  let cst;
  if (muestra) {
    cst = { codigo: 'MUES-TRA0-0000', nombre: 'Nombre del participante', promedio: 85, emitida: new Date().toISOString() };
  } else {
    cst = await almacen.miConstancia();
    if (!cst) {
      const r = await almacen.emitirConstancia();
      if (!r.ok) {
        raiz.innerHTML = `<div class="verificar"><div class="ver-tarjeta"><h2>Aún no puede obtener la constancia</h2>
          <p>${esc(r.error)}</p><a class="btn" href="${PAGINAS.notas}">Ver mis notas</a></div></div>`;
        document.querySelector('.acciones-constancia').hidden = true;
        return;
      }
      cst = r.constancia;
    }
  }

  const fecha = new Date(cst.emitida).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  const enlace = PAGINAS.verificar + '?c=' + encodeURIComponent(cst.codigo);
  document.title = 'constancia-curso-ctei-' + cst.nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');

  raiz.innerHTML = `
  <div class="cst-marco">
    <div class="cst-cinta" aria-hidden="true"><i></i><i></i><i></i></div>
    ${muestra ? '<div class="cst-muestra" aria-hidden="true">MUESTRA</div>' : ''}
    <div class="cst-cab">
      <img src="${recurso('assets/img/marca/escudo-casanare.png')}" alt="Escudo de Casanare">
      <div><div class="l1">${esc(c.entidad)}</div><div class="l2">${esc(c.dependencia)}</div></div>
    </div>
    <div class="cst-titulo">CONSTANCIA</div>
    <div class="cst-sub">de finalización y aprobación</div>
    <div class="cst-a">Se hace constar que</div>
    <div class="cst-nombre">${esc(cst.nombre)}</div>
    <p class="cst-texto">participó y aprobó el curso virtual de autoformación
      <strong>«${esc(c.nombre)}»</strong>, con una intensidad de <strong>${esc(c.duracion)}</strong>,
      en modalidad ${esc(c.modalidad.charAt(0).toLowerCase() + c.modalidad.slice(1))}, con un promedio de <strong>${cst.promedio} sobre 100</strong>.</p>
    <p class="cst-texto" style="margin-top:6px">Expedida el ${fecha}.</p>
    <div class="cst-pie">
      <div class="cst-firma"><div class="linea"></div><strong>Coordinación del curso</strong>Equipo de Ciencia, Tecnología e Innovación</div>
      <div class="cst-qr">${qr(enlace)}<span class="cst-codigo">${esc(cst.codigo)}</span></div>
      <div class="cst-verifica">Verifique la autenticidad de esta constancia<br>escaneando el código QR o ingresando el código en<br><strong>${esc(PAGINAS.verificar.replace(/^https?:\/\//, ''))}</strong></div>
    </div>
  </div>`;
}

/* Código QR como SVG, con la librería qrcode-generator (js/vendor/qrcode.js). */
function qr(texto) {
  if (!window.qrcode) return '';
  const q = window.qrcode(0, 'M');
  q.addData(texto);
  q.make();
  const n = q.getModuleCount();
  let d = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) d += `M${x} ${y}h1v1h-1z`;
  return `<svg viewBox="-2 -2 ${n + 4} ${n + 4}" role="img" aria-label="Código QR de verificación" shape-rendering="crispEdges"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fff"/><path d="${d}" fill="#1F3A2C"/></svg>`;
}
