/* Historial de notas y avance del participante. */

import { montarMarco } from '../ui/marco.js';
import * as contenidos from '../datos/contenidos.js';
import * as almacen from '../datos/almacen.js';
import * as progreso from '../nucleo/progreso.js';
import * as evaluacion from '../nucleo/evaluacion.js';
import { esc } from '../ui/componentes.js';
import { notificar } from '../ui/avisos.js';

const u = await montarMarco({ activo: 'notas' });
if (u) pintar();

async function pintar() {
  const c = await contenidos.curso();
  const mods = await contenidos.modulos();
  const secs = c.secciones;
  const pr = evaluacion.promedio(u.id, mods);
  const ap = evaluacion.aprobados(u.id, mods);
  const completo = ap === mods.length;

  document.getElementById('contenido').innerHTML = `
  <div class="cabecera">
    <div>
      <span class="rotulo">Historial</span>
      <h2>Mis notas y avance</h2>
      <p>Se toma la nota más alta de cada módulo. La constancia se habilita al aprobar los ${mods.length} módulos.</p>
    </div>
    <button class="btn" type="button" ${completo ? '' : 'disabled'} id="btn-constancia">Descargar constancia</button>
  </div>
  <section class="cifras">
    <div class="cifra"><span class="v">${pr === null ? '—' : pr}</span><span class="k">Promedio general</span></div>
    <div class="cifra"><span class="v">${ap}/${mods.length}</span><span class="k">Módulos aprobados</span></div>
    <div class="cifra"><span class="v">${progreso.avanceGeneral(u.id, mods, secs)}%</span><span class="k">Avance del curso</span></div>
    <div class="cifra"><span class="v">${almacen.intentosDe(u.id).length}</span><span class="k">Intentos totales</span></div>
  </section>
  <section class="panel">
    <div class="panel-cab"><h3>Detalle por módulo</h3></div>
    <div class="tabla-env"><table>
      <thead><tr><th>Módulo</th><th>Avance</th><th>Intentos</th><th>Mejor nota</th><th>Estado</th></tr></thead>
      <tbody>${mods.map(m => {
        const n = evaluacion.mejorNota(u.id, m.id);
        const e = progreso.estadoModulo(u.id, m, secs);
        const k = almacen.intentosDe(u.id, m.id).length;
        return `<tr>
          <td><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${m.color};margin-right:.5rem"></span><strong style="font-weight:600">${m.numero}.</strong> ${esc(m.titulo)}</td>
          <td class="n">${progreso.avanceModulo(u.id, m.id, secs)}%</td><td class="n">${k}</td>
          <td class="n">${n === null ? '—' : n}</td><td><span class="pastilla ${e.pastilla}">${e.texto}</span></td></tr>`;
      }).join('')}</tbody>
    </table></div>
  </section>`;

  document.getElementById('btn-constancia').addEventListener('click',
    () => notificar('La constancia en PDF se genera en la versión de producción'));
}
