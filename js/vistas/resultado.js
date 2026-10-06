/* Resultado del último intento, con retroalimentación por pregunta. */

import { montarMarco } from '../ui/marco.js';
import * as contenidos from '../datos/contenidos.js';
import * as almacen from '../datos/almacen.js';
import { PAGINAS } from '../config.js';
import { esc, parametro } from '../ui/componentes.js';

const id = parametro('m') || 'm1';
const u = await montarMarco({ activo: 'modulo', moduloActivo: id });
if (u) pintar();

async function pintar() {
  const c = await contenidos.curso();
  const m = await contenidos.modulo(id);
  const preguntas = await contenidos.preguntas(id);
  const r = almacen.ultimoResultado();
  const cont = document.getElementById('contenido');

  if (!r || r.moduloId !== id) {
    cont.innerHTML = `<div class="cabecera"><div><h2>No hay un resultado reciente</h2>
      <p>Presente la evaluación del módulo para ver aquí su resultado.</p></div>
      <a class="btn" href="${PAGINAS.modulo}?m=${id}">Ir al módulo</a></div>`;
    return;
  }

  document.documentElement.style.setProperty('--mod', m.color);
  document.documentElement.style.setProperty('--mod-suave', m.colorSuave);
  const ok = r.nota >= c.notaMinima;

  cont.innerHTML = `
  <div class="cabecera">
    <div>
      <span class="rotulo">Módulo ${m.numero} · Resultado</span>
      <h2>${ok ? 'Módulo aprobado' : 'Aún no alcanza el mínimo'}</h2>
      <p>${ok ? 'El resultado quedó registrado en su historial de notas.'
              : `Necesita ${c.notaMinima} puntos para aprobar. Puede repasar el módulo y volver a presentar la evaluación.`}</p>
    </div>
  </div>
  <section class="marcador">
    <div>
      <div class="grande" style="color:${ok ? 'var(--ok)' : 'var(--crit)'}">${r.nota}</div>
      <div class="de">sobre 100</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:.3rem">
      <span class="pastilla ${ok ? 'p-ok' : 'p-crit'}">${ok ? 'Aprobado' : 'No aprobado'}</span>
      <span class="pista mono">${r.correctas} de ${r.total} respuestas correctas</span>
      <span class="pista">Mínimo para aprobar: ${c.notaMinima}</span>
    </div>
    <div style="margin-left:auto;display:flex;gap:.6rem;flex-wrap:wrap">
      <a class="btn btn-linea" href="${PAGINAS.evaluacion}?m=${m.id}">Repetir evaluación</a>
      <a class="btn btn-mod" href="${PAGINAS.inicio}">Volver a los módulos</a>
    </div>
  </section>
  <section class="quiz">
    ${preguntas.map((q, i) => {
      const elegida = r.respuestas[i];
      return `<div class="q">
        <span class="qn">PREGUNTA ${i + 1}</span>
        <h4>${esc(q.enunciado)}</h4>
        <div class="ops">${q.opciones.map((op, j) => {
          let cls = 'op';
          if (j === r.claves[i]) cls += ' bien';
          else if (j === elegida) cls += ' mal';
          return `<div class="${cls}"><span>${esc(op)}</span></div>`;
        }).join('')}</div>
        <p class="retro">${esc(r.retroalimentacion[i] || '')}</p>
      </div>`;
    }).join('')}
  </section>`;
}
