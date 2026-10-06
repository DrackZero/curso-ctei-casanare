/* Carga el contenido del curso desde los archivos JSON.
   Requiere servidor local: fetch no funciona con file://  */

import { RUTA_CONTENIDO } from '../config.js';

const cache = {};

async function leer(archivo) {
  if (cache[archivo]) return cache[archivo];
  const r = await fetch(RUTA_CONTENIDO + archivo, { cache: 'no-cache' });
  if (!r.ok) throw new Error('No se pudo leer ' + archivo + ' (' + r.status + ')');
  cache[archivo] = await r.json();
  return cache[archivo];
}

export async function curso()      { return leer('curso.json'); }
export async function materiales() { return leer('materiales.json'); }

export async function modulos() {
  const d = await leer('modulos.json');
  return d.modulos.filter(m => m.publicado !== false);
}
export async function modulo(id) {
  return (await modulos()).find(m => m.id === id) || null;
}
export async function preguntas(moduloId) {
  const d = await leer('preguntas/' + moduloId + '.json');
  return d.preguntas;
}
export async function secciones() { return (await curso()).secciones; }

/* Devuelve la ruta de imagen de un material por su id */
export async function rutaMaterial(id) {
  const d = await materiales();
  const m = d.materiales.find(x => x.id === id);
  return m ? m.archivo : '';
}
export async function material(id) {
  const d = await materiales();
  return d.materiales.find(x => x.id === id) || null;
}
