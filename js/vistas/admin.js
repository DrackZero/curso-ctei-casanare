/* Panel de seguimiento de la coordinación: indicadores, gráficas
   estadísticas, análisis por pregunta, informe PDF y exportación de datos. */

import { montarMarco } from '../ui/marco.js';
import { PAGINAS } from '../config.js';
import * as contenidos from '../datos/contenidos.js';
import * as tablero from '../ui/tablero.js';
import { activarTooltips } from '../ui/graficas.js';
import { notificar } from '../ui/avisos.js';

const u = await montarMarco({ activo: '', exigir: 'admin' });
if (u) pintar();

async function pintar() {
  const r = await tablero.calcular();
  const mats = (await contenidos.materiales()).materiales;
  const pendientes = mats.filter(m => m.estado !== 'coincide').length;
  const aRevisar = r.porPregunta.filter(p => p.revisar).length;

  const raiz = document.getElementById('contenido');
  raiz.innerHTML = `
  <div class="cabecera">
    <div>
      <span class="rotulo">Coordinación del curso</span>
      <h2>Seguimiento y resultados</h2>
      <p>Participación, desempeño por módulo y calidad de las preguntas. Estas cifras alimentan el informe en PDF y el análisis estadístico del curso.</p>
    </div>
    <div class="acciones-panel">
      <a class="btn" href="${PAGINAS.reporte}" target="_blank" rel="noopener">Generar informe PDF</a>
      <button class="btn btn-linea" type="button" id="btn-csv">Exportar datos (CSV)</button>
      <a class="btn btn-linea" href="${PAGINAS.revision}">Revisión de materiales${pendientes ? ' (' + pendientes + ')' : ''}</a>
    </div>
  </div>

  ${r.esDemo ? `<div class="aviso-datos" role="note">
    <span aria-hidden="true">ⓘ</span>
    <span><strong>Datos simulados.</strong> La cohorte de ${r.resumen.inscritos} participantes es de demostración, generada para probar las gráficas.
    Con participantes reales las cifras se calculan igual.</span>
  </div>` : ''}

  ${tablero.kpis(r)}

  ${tablero.bloqueHallazgos(r)}

  <div class="g-rejilla-panel">
    ${tablero.graficaEmbudo(r)}
    ${tablero.graficaDistribucion(r)}
    ${tablero.graficaAprobacion(r)}
    ${tablero.graficaNotas(r)}
    ${tablero.graficaPreguntas(r)}
  </div>

  ${tablero.tablaParticipantes(r)}`;

  activarTooltips(raiz);

  document.getElementById('btn-csv').addEventListener('click', () => {
    const n = tablero.descargarCSV(r);
    notificar(`Se exportaron ${n} evaluaciones con el detalle por pregunta`);
  });

  if (aRevisar) console.info(`${aRevisar} preguntas con acierto bajo el umbral de revisión`);
}
