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
  const doc = await contenidos.documentoPreguntas(id);
  const banco = doc.preguntas;
  // Cada intento presenta «preguntasPorIntento» preguntas del banco, al azar y en orden aleatorio.
  const cuantas = Math.min(banco.length, Number(doc.preguntasPorIntento) || banco.length);
  const orden = banco.map((_, i) => i);
  for (let i = orden.length - 1; i > 0; i--) {          // barajado Fisher-Yates
    const j = Math.floor(Math.random() * (i + 1));
    [orden[i], orden[j]] = [orden[j], orden[i]];
  }
  const elegidas = orden.slice(0, cuantas);
  const preguntas = elegidas.map(i => banco[i]);
  document.documentElement.style.setProperty('--mod', m.color);
  document.documentElement.style.setProperty('--mod-suave', m.colorSuave);

  document.getElementById('contenido').innerHTML = `
  <div class="cabecera">
    <div>
      <span class="rotulo">Módulo ${m.numero} · Evaluación calificativa</span>
      <h2>${esc(m.titulo)}</h2>
      <p>Seleccione una respuesta por pregunta. La nota se calcula sobre ${preguntas.length} preguntas y queda registrada en su historial.${cuantas < banco.length ? ' Las preguntas se eligen al azar de un banco de ' + banco.length + ': cada intento puede traer preguntas distintas.' : ''}</p>
    </div>
    <a class="btn btn-linea btn-sm" href="${PAGINAS.modulo}?m=${m.id}">Volver al módulo</a>
  </div>
  ${u.rol === 'admin' ? `<div class="aviso-datos" role="note"><span aria-hidden="true">ⓘ</span>
    <span><strong>Modo prueba.</strong> Como coordinación puede presentar la evaluación para revisar las preguntas;
    el resultado se muestra pero no se guarda ni cuenta en las estadísticas.</span></div>` : ''}
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
    // Una posición por pregunta del banco: la opción elegida, o -1 si no salió en este intento.
    const respuestas = banco.map(() => -1);
    for (let i = 0; i < preguntas.length; i++) {
      const sel = f.querySelector('input[name="q' + i + '"]:checked');
      if (!sel) {
        err.textContent = 'Falta responder la pregunta ' + (i + 1) + '.';
        f.querySelector('[data-q="' + i + '"]').scrollIntoView({ block: 'center', behavior: 'smooth' });
        return;
      }
      respuestas[elegidas[i]] = Number(sel.value);
    }
    const boton = f.querySelector('button[type="submit"]');
    boton.disabled = true;
    const r = await evaluacion.presentar(m.id, respuestas);
    if (!r.ok) { err.textContent = r.error; boton.disabled = false; return; }
    almacen.guardarUltimoResultado({ moduloId: m.id, ...r.resultado });
    location.href = PAGINAS.resultado + '?m=' + m.id;
  });
}
