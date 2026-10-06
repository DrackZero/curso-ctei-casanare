/* Evaluación calificativa del módulo. */

import { montarMarco } from '../ui/marco.js';
import * as contenidos from '../datos/contenidos.js';
import * as almacen from '../datos/almacen.js';
import * as evaluacion from '../nucleo/evaluacion.js';
import { PAGINAS } from '../config.js';
import { esc, parametro } from '../ui/componentes.js';

const id = parametro('m') || 'm1';
const u = await montarMarco({ activo: 'modulo', moduloActivo: id });
if (u) pintar();

async function pintar() {
  const c = await contenidos.curso();
  const m = await contenidos.modulo(id);
  const preguntas = await contenidos.preguntas(id);
  document.documentElement.style.setProperty('--mod', m.color);
  document.documentElement.style.setProperty('--mod-suave', m.colorSuave);

  document.getElementById('contenido').innerHTML = `
  <div class="cabecera">
    <div>
      <span class="rotulo">Módulo ${m.numero} · Evaluación calificativa</span>
      <h2>${esc(m.titulo)}</h2>
      <p>Seleccione una respuesta por pregunta. La nota se calcula sobre ${preguntas.length} preguntas y queda registrada en su historial.</p>
    </div>
    <a class="btn btn-linea btn-sm" href="${PAGINAS.modulo}?m=${m.id}">Volver al módulo</a>
  </div>
  <form class="quiz" id="form-quiz">
    ${preguntas.map((q, i) => `
      <fieldset class="q" style="border:none;margin:0" data-q="${i}">
        <span class="qn">PREGUNTA ${i + 1} DE ${preguntas.length}</span>
        <h4>${esc(q.enunciado)}</h4>
        <div class="ops">
          ${q.opciones.map((op, j) => `<label class="op" data-op="${j}"><input type="radio" name="q${i}" value="${j}"><span>${esc(op)}</span></label>`).join('')}
        </div>
      </fieldset>`).join('')}
    <p class="err" id="quiz-err"></p>
    <button class="btn btn-mod" type="submit">Calificar evaluación</button>
  </form>`;

  const f = document.getElementById('form-quiz');
  f.querySelectorAll('.op').forEach(l => l.addEventListener('click', () => {
    l.parentElement.querySelectorAll('.op').forEach(o => o.classList.remove('marcada'));
    l.classList.add('marcada');
  }));

  f.addEventListener('submit', async ev => {
    ev.preventDefault();
    const err = document.getElementById('quiz-err');
    const respuestas = [];
    for (let i = 0; i < preguntas.length; i++) {
      const sel = f.querySelector('input[name="q' + i + '"]:checked');
      if (!sel) { err.textContent = 'Falta responder la pregunta ' + (i + 1) + '.'; return; }
      respuestas.push(Number(sel.value));
    }
    const boton = f.querySelector('button[type="submit"]');
    boton.disabled = true;
    const r = await evaluacion.presentar(m.id, respuestas);
    if (!r.ok) { err.textContent = r.error; boton.disabled = false; return; }
    almacen.guardarUltimoResultado({ moduloId: m.id, ...r.resultado });
    location.href = PAGINAS.resultado + '?m=' + m.id;
  });
}
