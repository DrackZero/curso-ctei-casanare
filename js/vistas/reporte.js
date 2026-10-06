/* Informe de resultados imprimible.
   Mismas cifras y gráficas del panel de seguimiento, maquetadas para papel
   carta. «Descargar PDF» abre la impresión del navegador: el PDF resultante
   es vectorial (texto seleccionable, gráficas nítidas) y no depende de
   ninguna librería externa. */

import * as almacen from '../datos/almacen.js';
import * as sesion from '../nucleo/sesion.js';
import { PAGINAS, recurso } from '../config.js';
import * as tablero from '../ui/tablero.js';
import { esc } from '../ui/componentes.js';

await almacen.iniciar();
const u = sesion.exigirAdmin();
if (u) await pintar();

async function pintar() {
  const r = await tablero.calcular();
  const hoy = new Date();
  const fechaLarga = hoy.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  const hora = hoy.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  document.title = 'informe-resultados-curso-ctei-' + hoy.toISOString().slice(0, 10);
  document.getElementById('volver').href = PAGINAS.admin;

  const s = r.resumen;
  const informe = document.getElementById('informe');
  informe.innerHTML = `
  <header class="inf-cab">
    <div class="inf-marca">
      <img src="${recurso('assets/img/marca/escudo-casanare.png')}" alt="">
      <div>
        <div class="l1">Gobernación de Casanare</div>
        <div class="l2">Departamento Administrativo de Planeación · Ciencia, Tecnología e Innovación</div>
      </div>
    </div>
    <div class="inf-corte">
      <span>Corte de datos</span>
      <b>${esc(fechaLarga)}</b>
      <span>${esc(hora)}</span>
    </div>
  </header>

  <section class="inf-portada">
    <span class="rotulo">Informe de resultados</span>
    <h1>${esc(r.curso.nombre)}</h1>
    <dl class="inf-ficha">
      <div><dt>Modalidad</dt><dd>${esc(r.curso.modalidad)}</dd></div>
      <div><dt>Duración</dt><dd>${esc(r.curso.duracion)} · ${r.modulos.length} módulos</dd></div>
      <div><dt>Nota mínima de aprobación</dt><dd>${r.curso.notaMinima} sobre 100</dd></div>
      <div><dt>Fuente</dt><dd>Plataforma de autoevaluación del curso</dd></div>
    </dl>
    ${r.esDemo ? `<p class="inf-aviso"><strong>Datos simulados.</strong> Este informe se generó con una cohorte de demostración
      de ${s.inscritos} participantes para validar el formato. Con datos reales se calcula exactamente igual.</p>` : ''}
  </section>

  <section class="inf-sec">
    <h2><span>1</span>Resumen</h2>
    ${tablero.kpis(r)}
    ${tablero.bloqueHallazgos(r)}
  </section>

  <section class="inf-sec">
    <h2><span>2</span>Participación</h2>
    ${tablero.graficaEmbudo(r)}
  </section>

  <section class="inf-sec salto-antes">
    <h2><span>3</span>Desempeño por módulo</h2>
    ${tablero.graficaAprobacion(r)}
    ${tablero.graficaNotas(r)}
  </section>

  <section class="inf-sec">
    <h2><span>4</span>Distribución de notas</h2>
    ${tablero.graficaDistribucion(r)}
  </section>

  <section class="inf-sec salto-antes">
    <h2><span>5</span>Análisis por pregunta</h2>
    ${tablero.graficaPreguntas(r)}
  </section>

  <section class="inf-sec salto-antes">
    <h2><span>6</span>Participantes</h2>
    ${tablero.tablaParticipantes(r, { compacta: true })}
  </section>

  <section class="inf-sec">
    <h2><span>7</span>Nota metodológica</h2>
    <ul class="inf-metodo">
      <li><strong>Avance</strong>: proporción de secciones consultadas sobre el total del curso (${r.modulos.length} módulos × ${r.curso.secciones.length} secciones).</li>
      <li><strong>Nota por módulo</strong>: se toma el mejor intento de cada participante; los intentos son ilimitados.</li>
      <li><strong>Aprobación</strong>: nota igual o superior a ${r.curso.notaMinima}. La tasa por módulo se calcula sobre el total de inscritos.</li>
      <li><strong>Distribución de notas</strong>: incluye todos los intentos presentados, también los repetidos.</li>
      <li><strong>Acierto por pregunta</strong>: porcentaje de respuestas correctas sobre todas las respuestas registradas a esa pregunta.
        Por debajo de 50 % se sugiere revisar la redacción de la pregunta o reforzar el tema en el módulo.</li>
      <li><strong>Participantes</strong>: solo usuarios con rol de participante; las cuentas de coordinación no se cuentan.</li>
    </ul>
  </section>

  <footer class="inf-pie">
    Generado automáticamente por la plataforma de autoevaluación · ${esc(fechaLarga)}, ${esc(hora)}
  </footer>`;

  // en el papel todas las tablas van abiertas
  informe.querySelectorAll('details').forEach(d => { d.open = true; });

  document.getElementById('btn-pdf').addEventListener('click', () => window.print());
  if (new URLSearchParams(location.search).get('imprimir') === '1') setTimeout(() => window.print(), 400);
}
