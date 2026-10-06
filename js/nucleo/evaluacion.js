/* Reglas de calificación.
   La calificación ocurre en el servidor (función presentar_evaluacion de
   supabase/esquema.sql): el navegador nunca conoce la respuesta correcta
   antes de enviar sus respuestas. */

import * as almacen from '../datos/almacen.js';
import { UMBRAL_DEFECTO } from '../config.js';

export async function presentar(moduloId, respuestas) {
  return almacen.presentarEvaluacion(moduloId, respuestas);
}

export function mejorNota(usuarioId, moduloId) {
  const notas = almacen.intentosDe(usuarioId, moduloId).map(a => a.nota);
  return notas.length ? Math.max(...notas) : null;
}

export function promedio(usuarioId, modulos) {
  const notas = modulos.map(m => mejorNota(usuarioId, m.id)).filter(n => n !== null);
  return notas.length ? Math.round(notas.reduce((a, b) => a + b, 0) / notas.length) : null;
}

export function aprobados(usuarioId, modulos, umbral = UMBRAL_DEFECTO) {
  return modulos.filter(m => (mejorNota(usuarioId, m.id) ?? -1) >= umbral).length;
}

export function aprobo(nota, umbral = UMBRAL_DEFECTO) { return nota >= umbral; }
