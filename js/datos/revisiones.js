/* Observaciones del equipo de CTeI sobre los materiales.
   Se guardan en el navegador de quien revisa y se exportan en un archivo
   que el equipo de desarrollo aplica sobre contenido/materiales.json. */

const CLAVE = 'ctei_revisiones_v1';

function leer() {
  try { return JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch (e) { return {}; }
}
function escribir(d) {
  try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) {}
}

export function todas() { return leer(); }
export function de(materialId) { return leer()[materialId] || null; }

export function guardar(materialId, { decision, observacion, revisadoPor }) {
  const d = leer();
  d[materialId] = {
    decision, observacion, revisadoPor,
    fecha: new Date().toISOString()
  };
  escribir(d);
  return d[materialId];
}

export function limpiar() { escribir({}); }

/* Exporta las observaciones a un archivo descargable */
export function exportar(materiales) {
  const revs = leer();
  const salida = {
    exportado: new Date().toISOString(),
    nota: 'Observaciones de revisión de materiales. Aplicar sobre contenido/materiales.json.',
    revisiones: materiales.map(m => ({
      id: m.id,
      titulo: m.titulo,
      moduloAsignado: m.moduloAsignado,
      numeroImpreso: m.numeroImpreso,
      estadoActual: m.estado,
      ...(revs[m.id] || { decision: '', observacion: '', revisadoPor: '', fecha: '' })
    })).filter(r => r.decision || r.observacion)
  };
  const blob = new Blob([JSON.stringify(salida, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'revision-materiales-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return salida.revisiones.length;
}
