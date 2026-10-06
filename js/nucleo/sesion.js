/* Reglas de acceso. No toca el DOM ni el almacenamiento directamente.
   Las contraseñas las verifica y guarda (con hash) Supabase Auth. */

import * as almacen from '../datos/almacen.js';
import { PAGINAS } from '../config.js';

const CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const CLAVE_MINIMA = 10;

/* Traduce los errores de Supabase Auth sin revelar si una cuenta existe. */
function mensaje(error) {
  const m = String(error && (error.code || error.message) || '');
  if (/invalid_credentials|Invalid login/i.test(m)) return 'El correo o la contraseña no coinciden.';
  if (/email_not_confirmed|not confirmed/i.test(m))  return 'Confirme su correo con el enlace que le enviamos antes de ingresar.';
  if (/weak_password|pwned|leaked/i.test(m))          return 'Esa contraseña es débil o aparece en filtraciones conocidas. Elija otra.';
  if (/rate|too many|429/i.test(m))                   return 'Demasiados intentos. Espere unos minutos e inténtelo de nuevo.';
  if (/user_already_exists|already registered/i.test(m)) return 'No fue posible completar la inscripción con ese correo. Si ya tiene cuenta, ingrese o recupere su contraseña.';
  return 'No fue posible completar la operación. Inténtelo de nuevo.';
}

export function validarClave(clave) {
  clave = String(clave || '');
  if (clave.length < CLAVE_MINIMA) return `La contraseña debe tener al menos ${CLAVE_MINIMA} caracteres.`;
  if (!/[a-zA-Z]/.test(clave) || !/[0-9]/.test(clave)) return 'La contraseña debe combinar letras y números.';
  return null;
}

export async function ingresar(correo, clave) {
  correo = String(correo).trim().toLowerCase();
  if (!CORREO.test(correo)) return { ok:false, error:'Escriba un correo electrónico válido.' };
  if (!clave) return { ok:false, error:'Escriba su contraseña.' };
  const r = await almacen.ingresar(correo, clave);
  return r.ok ? { ok:true, usuario: almacen.usuarioActual() } : { ok:false, error: mensaje(r.error) };
}

export async function inscribir({ nombre, correo, clave, entidad, aceptoDatos }) {
  nombre = String(nombre || '').trim();
  correo = String(correo || '').trim().toLowerCase();
  entidad = String(entidad || '').trim();
  if (nombre.length < 3 || nombre.length > 120) return { ok:false, error:'Escriba su nombre completo.' };
  if (!CORREO.test(correo))  return { ok:false, error:'Escriba un correo electrónico válido.' };
  if (entidad.length > 160)  return { ok:false, error:'El nombre de la entidad es demasiado largo.' };
  const mala = validarClave(clave);
  if (mala) return { ok:false, error: mala };
  if (!aceptoDatos) return { ok:false, error:'Debe autorizar el tratamiento de sus datos personales para inscribirse.' };

  const r = await almacen.registrar({ correo, clave, nombre, entidad, aceptoDatos });
  if (!r.ok) return { ok:false, error: mensaje(r.error) };
  return { ok:true, confirmar: !!r.confirmar, usuario: almacen.usuarioActual() };
}

export async function recuperar(correo, volverA) {
  correo = String(correo || '').trim().toLowerCase();
  if (!CORREO.test(correo)) return { ok:false, error:'Escriba el correo con el que se inscribió.' };
  const r = await almacen.recuperarClave(correo, volverA);
  // Misma respuesta exista o no la cuenta, para no revelar quién está inscrito.
  return r.ok || !/rate|429/i.test(String(r.error && r.error.message)) ? { ok:true } : { ok:false, error: mensaje(r.error) };
}

export async function cambiarClave(nueva) {
  const mala = validarClave(nueva);
  if (mala) return { ok:false, error: mala };
  const r = await almacen.cambiarClave(nueva);
  return r.ok ? { ok:true } : { ok:false, error: mensaje(r.error) };
}

export async function salir() { await almacen.cerrarSesion(); }

export function actual() { return almacen.usuarioActual(); }
export function esAdmin() { const u = actual(); return !!u && u.rol === 'admin'; }

/* Guardias de navegación. Son comodidad de interfaz: la protección real de los
   datos la hacen las políticas RLS del servidor. */
export function exigirSesion() {
  const u = actual();
  if (!u) { location.replace(PAGINAS.acceso); return null; }
  return u;
}
export function exigirAdmin() {
  const u = exigirSesion();
  if (u && u.rol !== 'admin') { location.replace(PAGINAS.inicio); return null; }
  return u;
}
