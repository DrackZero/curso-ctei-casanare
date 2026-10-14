/* Carga el contenido del curso (curso, módulos, materiales y preguntas).
   Primero busca la versión editada por la coordinación en la base de datos (tabla
   contenido); si no existe, usa el archivo JSON del repositorio (contenido/*.json). */

import { RUTA_CONTENIDO } from '../config.js';
import * as almacen from './almacen.js';

const cache = {};

async function leer(clave, archivo) {
  if (cache[clave]) return cache[clave];
  cache[clave] = (async () => {
    const guardado = await almacen.leerContenido(clave);
    if (guardado) return guardado;
    const r = await fetch(RUTA_CONTENIDO + archivo, { cache: 'no-cache' });
    if (!r.ok) throw new Error('No se pudo leer ' + archivo + ' (' + r.status + ')');
    return r.json();
  })();
  try { return await cache[clave]; } catch (e) { delete cache[clave]; throw e; }
}

/* Olvida lo leído para que la siguiente lectura traiga lo recién guardado. */
export function olvidar() { for (const k in cache) delete cache[k]; }

export async function curso()      { return leer('curso', 'curso.json'); }
export async function materiales() { return leer('materiales', 'materiales.json'); }

/* Documento completo de módulos, incluidos los no publicados (para el editor). */
export async function documentoModulos() { return leer('modulos', 'modulos.json'); }

export async function modulos() {
  const d = await documentoModulos();
  return d.modulos.filter(m => m.publicado !== false);
}
export async function modulo(id) {
  return (await modulos()).find(m => m.id === id) || null;
}
export async function documentoPreguntas(moduloId) {
  return leer('preguntas:' + moduloId, 'preguntas/' + moduloId + '.json');
}
export async function preguntas(moduloId) {
  return (await documentoPreguntas(moduloId)).preguntas;
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
