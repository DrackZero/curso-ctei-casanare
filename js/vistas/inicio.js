/* Página de inicio: banner, buscador y tarjetas de los módulos. */

import { montarMarco } from '../ui/marco.js';
import * as contenidos from '../datos/contenidos.js';
import * as progreso from '../nucleo/progreso.js';
import * as evaluacion from '../nucleo/evaluacion.js';
import * as almacen from '../datos/almacen.js';
import { PAGINAS, recurso } from '../config.js';
import { esc } from '../ui/componentes.js';

let busqueda = '';

const u = await montarMarco({ activo: 'inicio' });
if (u) pintar();

async function pintar() {
  const c = await contenidos.curso();
  const mods = await contenidos.modulos();
  const secs = c.secciones;
  const mats = (await contenidos.materiales()).materiales;

  const pr = evaluacion.promedio(u.id, mods);
  const siguiente = mods.find(m => progreso.estadoModulo(u.id, m, secs).clave !== 'aprobado') || mods[0];
  const q = busqueda.trim().toLowerCase();
  const lista = q ? mods.filter(m =>
      (m.titulo + ' ' + m.producto + ' ' + m.contenidos.join(' ') + ' ' + m.proposito).toLowerCase().includes(q)) : mods;
  const mascota = recurso('assets/img/marca/mascota-ctei.webp');

  document.getElementById('contenido').innerHTML = `
  <section class="destacado">
    <div class="franja-lat" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="dest-texto">
      <span class="dest-eyebrow">Curso virtual de autoformación · MOOC</span>
      <h2 class="dest-titulo">Innovación Pública<em>y proyectos CTeI</em></h2>
      <div class="dest-linea"><b></b>Ciencia · Conocimiento · Territorio</div>
      <div class="dest-anio">2026</div>
    </div>
    <img class="dest-masc" src="${mascota}" alt="">
    <svg class="onda" viewBox="0 0 1200 90" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0,52 C220,16 420,74 640,52 C860,30 1030,10 1200,34 L1200,90 L0,90 Z" fill="#FCD116"/>
      <path d="M0,62 C230,28 430,84 650,62 C870,40 1040,22 1200,46 L1200,90 L0,90 Z" fill="#003893" opacity=".85"/>
      <path d="M0,71 C240,40 440,92 660,71 C880,50 1050,34 1200,57 L1200,90 L0,90 Z" fill="#CE1126" opacity=".85"/>
      <path d="M0,80 C250,54 450,98 670,80 C890,62 1060,48 1200,68 L1200,90 L0,90 Z" fill="#0B5D3B"/>
    </svg>
  </section>

  <section class="hero-datos" style="border:1px solid var(--line);border-radius:var(--r);overflow:hidden">
    <div><span class="k">Modalidad</span><span class="v">Virtual asincrónica</span></div>
    <div><span class="k">Duración total</span><span class="v">${esc(c.duracion)}</span></div>
    <div><span class="k">Enfoque</span><span class="v">Microaprendizaje</span></div>
    <div><span class="k">Producto final</span><span class="v">Ficha Básica de Proyecto</span></div>
    <div style="display:flex;align-items:center"><a class="btn" href="${PAGINAS.modulo}?m=${siguiente.id}">Continuar en el módulo ${siguiente.numero}</a></div>
  </section>

  <form class="buscador" id="form-buscar" role="search">
    <input type="search" id="q" placeholder="Buscar en los módulos del curso (por ejemplo: árbol de problemas, MGA, convocatoria)" value="${esc(busqueda)}" aria-label="Buscar en los módulos">
    <button class="btn" type="submit">Buscar</button>
    ${q ? '<button class="btn btn-linea" type="button" id="limpiar-q">Limpiar</button>' : ''}
  </form>

  <section class="ruta" aria-label="Ruta formativa consolidada">
    <span class="rotulo" style="margin-right:.3rem">Ruta</span>
    ${c.rutaFormativa.map((r, i) => `${i ? '<span class="fl">→</span>' : ''}<span class="paso">${esc(r)}</span>`).join('')}
  </section>

  <section class="cifras">
    <div class="cifra"><span class="v">${progreso.avanceGeneral(u.id, mods, secs)}%</span><span class="k">Avance del curso</span></div>
    <div class="cifra"><span class="v">${evaluacion.aprobados(u.id, mods)}<span style="font-size:1rem;color:var(--muted)">/${mods.length}</span></span><span class="k">Módulos aprobados</span></div>
    <div class="cifra"><span class="v">${pr === null ? '—' : pr}</span><span class="k">Promedio</span></div>
    <div class="cifra"><span class="v">${almacen.intentosDe(u.id).length}</span><span class="k">Evaluaciones presentadas</span></div>
  </section>

  <div class="cabecera"><div>
    <h2>${q ? 'Resultados de la búsqueda' : 'Módulos del curso'}</h2>
    <p>${q ? `${lista.length} módulo${lista.length === 1 ? '' : 's'} coinciden con “${esc(busqueda)}”.`
           : 'Cada módulo abre con su infografía y reúne todo lo que debe conocer antes de presentar la evaluación calificativa.'}</p>
  </div></div>

  ${lista.length ? `<section class="tarjetas">
    ${lista.map(m => {
      const e = progreso.estadoModulo(u.id, m, secs);
      const av = progreso.avanceModulo(u.id, m.id, secs);
      const n = evaluacion.mejorNota(u.id, m.id);
      const pendientes = m.infografias.filter(i => {
        const mat = mats.find(x => x.id === i.material);
        return mat && mat.estado !== 'coincide';
      }).length;
      return `<a class="tarj" href="${PAGINAS.modulo}?m=${m.id}" style="--mod:${m.color};--mod-suave:${m.colorSuave}">
        <span class="cinta"></span>
        <span class="cuerpo">
          <span class="arriba"><span class="num">MÓDULO ${m.numero}</span><span class="pastilla ${e.pastilla}">${e.texto}</span></span>
          <h3>${esc(m.titulo)}</h3>
          <span class="prod"><strong style="font-weight:600;color:var(--ink-2)">Producto:</strong> ${esc(m.producto)}</span>
          <span class="barra"><span style="width:${av}%"></span></span>
          <span class="pie">
            <span class="mono">${av}% visto</span><span>·</span>
            <span>${esc(m.duracion)}</span><span>·</span>
            <span>${esc(m.nivel)}</span>
            ${n !== null ? `<span>·</span><span class="mono">nota ${n}</span>` : ''}
          </span>
        </span>
      </a>`;
    }).join('')}
  </section>` : '<p class="pista">No se encontraron módulos con ese término. Pruebe con otra palabra.</p>'}`;

  const f = document.getElementById('form-buscar');
  f.addEventListener('submit', ev => { ev.preventDefault(); busqueda = document.getElementById('q').value; pintar(); });
  const lq = document.getElementById('limpiar-q');
  if (lq) lq.addEventListener('click', () => { busqueda = ''; pintar(); });
}
