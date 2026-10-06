/* Encabezado institucional: franja GOV.CO, enlaces de utilidad,
   marca de la Gobernación y menú principal. */

import { PAGINAS, recurso } from '../config.js';
import * as contenidos from '../datos/contenidos.js';
import * as sesion from '../nucleo/sesion.js';
import * as progreso from '../nucleo/progreso.js';
import { esc, iniciales } from './componentes.js';
import { notificar } from './avisos.js';

export async function pintarCabecera(contenedor, { activo = '', moduloActivo = '' } = {}) {
  const u = sesion.actual();
  const mods = await contenidos.modulos();
  const secs = await contenidos.secciones();

  contenedor.innerHTML = `
  <div class="cab-fija">
    <div class="govco">
      <div class="govco-in">
        <span class="marca-pais"><span class="sello">ESC</span><span class="tricolor" aria-hidden="true"><i></i><i></i><i></i></span>GOV.CO</span>
        <span class="acc">
          <button type="button" data-fuente="1" title="Aumentar tamaño de letra">A+</button>
          <button type="button" data-fuente="-1" title="Reducir tamaño de letra">A−</button>
          <button type="button" data-fuente="0" title="Restablecer tamaño de letra">A</button>
        </span>
      </div>
    </div>

    <div class="utilidad">
      <div class="utilidad-in">
        <button type="button" data-institucional>Quiénes somos</button><span class="div">|</span>
        <button type="button" data-institucional>Atención al ciudadano</button><span class="div">|</span>
        <button type="button" data-institucional>Transparencia</button><span class="div">|</span>
        <button type="button" data-institucional>Contacto</button>
      </div>
    </div>

    <div class="barra-menu">
      <div class="barra-menu-in">
        <div class="marca-menu">
          <img src="${recurso('assets/img/marca/escudo-casanare.png')}" alt="">
          <div>
            <div class="l1">Gobernación de Casanare</div>
            <div class="l2">Planeación · CTeI</div>
          </div>
        </div>
        <nav class="menu" aria-label="Principal">
          <a class="enlace-menu" href="${PAGINAS.inicio}" ${activo === 'inicio' ? 'aria-current="page"' : ''}>Inicio</a>
          <span class="envuelve">
            <button type="button" id="btn-modulos" aria-expanded="false" ${activo === 'modulo' ? 'aria-current="page"' : ''}>
              Módulos <span class="caret">▼</span>
            </button>
            <div class="desplegable" id="lista-modulos" hidden>
              <div class="cab"><span class="rotulo">Ruta formativa · ${mods.length} módulos</span></div>
              ${mods.map(m => {
                const e = progreso.estadoModulo(u.id, m, secs);
                return `<a class="item-mod" href="${PAGINAS.modulo}?m=${m.id}" ${moduloActivo === m.id ? 'aria-current="page"' : ''}>
                  <span class="n" style="background:${m.color}">${m.numero}</span>
                  <span><span class="t">${esc(m.titulo)}</span><span class="d">${esc(m.duracion)} · ${esc(m.producto)}</span></span>
                  <span class="pastilla ${e.pastilla}">${e.texto}</span>
                </a>`;
              }).join('')}
            </div>
          </span>
        </nav>

        <div class="usuario envuelve">
          <button type="button" id="btn-usuario" aria-expanded="false">
            <span class="ini">${iniciales(u.nombre)}</span>
            <span>${esc(u.nombre.split(' ')[0])}</span>
            <span class="caret">▼</span>
          </button>
          <div class="desplegable menu-usr" id="menu-usuario" hidden>
            <div style="padding:.5rem .6rem;border-bottom:1px solid var(--line);margin-bottom:.25rem">
              <div style="font-weight:600;font-size:.88rem">${esc(u.nombre)}</div>
              <div class="pista">${u.rol === 'admin' ? 'Coordinación' : 'Participante'} · ${esc(u.correo)}</div>
            </div>
            <a class="enlace-menu-usr" href="${PAGINAS.notas}">Mis notas y avance</a>
            ${u.rol === 'admin' ? `<a class="enlace-menu-usr" href="${PAGINAS.admin}">Seguimiento del curso</a>
            <a class="enlace-menu-usr" href="${PAGINAS.revision}">Revisión de materiales</a>` : ''}
            <button type="button" id="btn-salir">Cerrar sesión</button>
          </div>
        </div>
      </div>
    </div>
  </div>`;

  conectar(contenedor);
}

function conectar(raiz) {
  const alternar = (boton, panel) => {
    boton.addEventListener('click', e => {
      e.stopPropagation();
      const abierto = !panel.hidden;
      document.querySelectorAll('.desplegable').forEach(d => { d.hidden = true; });
      document.querySelectorAll('[aria-expanded]').forEach(b => b.setAttribute('aria-expanded', 'false'));
      panel.hidden = abierto;
      boton.setAttribute('aria-expanded', String(!abierto));
    });
  };
  alternar(raiz.querySelector('#btn-modulos'), raiz.querySelector('#lista-modulos'));
  alternar(raiz.querySelector('#btn-usuario'), raiz.querySelector('#menu-usuario'));
  raiz.querySelectorAll('.desplegable').forEach(d => d.addEventListener('click', e => e.stopPropagation()));
  document.addEventListener('click', () => {
    raiz.querySelectorAll('.desplegable').forEach(d => { d.hidden = true; });
    raiz.querySelectorAll('[aria-expanded]').forEach(b => b.setAttribute('aria-expanded', 'false'));
  });

  raiz.querySelectorAll('[data-fuente]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const paso = Number(b.dataset.fuente);
    const actual = parseFloat(document.body.style.fontSize) || 15.5;
    document.body.style.fontSize = paso === 0 ? '' : Math.min(20, Math.max(13, actual + paso * 1.2)) + 'px';
  }));

  raiz.querySelectorAll('[data-institucional]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    notificar('Sección institucional pendiente de enlazar con el portal de la Gobernación');
  }));

  raiz.querySelector('#btn-salir').addEventListener('click', async () => {
    await sesion.salir();
    location.href = PAGINAS.acceso;
  });
}
