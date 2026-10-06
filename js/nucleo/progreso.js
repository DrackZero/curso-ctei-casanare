/* Cálculo de avance. Recibe datos, devuelve números: no dibuja nada. */

import * as almacen from '../datos/almacen.js';
import { mejorNota } from './evaluacion.js';
import { UMBRAL_DEFECTO } from '../config.js';

export function seccionVista(usuarioId, moduloId, seccion) {
  return !!almacen.progresoDe(usuarioId)[moduloId + ':' + seccion];
}

export function seccionesVistas(usuarioId, moduloId, secciones) {
  return secciones.filter(s => seccionVista(usuarioId, moduloId, s.k)).length;
}

export function avanceModulo(usuarioId, moduloId, secciones) {
  return Math.round(seccionesVistas(usuarioId, moduloId, secciones) / secciones.length * 100);
}

export function avanceGeneral(usuarioId, modulos, secciones) {
  const total = modulos.length * secciones.length;
  const vistas = modulos.reduce((s, m) => s + seccionesVistas(usuarioId, m.id, secciones), 0);
  return total ? Math.round(vistas / total * 100) : 0;
}

export function estadoModulo(usuarioId, modulo, secciones, umbral = UMBRAL_DEFECTO) {
  const nota = mejorNota(usuarioId, modulo.id);
  if (nota !== null && nota >= umbral) return { clave:'aprobado',  pastilla:'p-ok',   texto:'Aprobado' };
  if (nota !== null)                   return { clave:'reprobado', pastilla:'p-crit', texto:'No aprobado' };
  if (avanceModulo(usuarioId, modulo.id, secciones) > 0)
                                       return { clave:'curso',     pastilla:'p-warn', texto:'En curso' };
  return { clave:'nuevo', pastilla:'p-idle', texto:'Sin iniciar' };
}
