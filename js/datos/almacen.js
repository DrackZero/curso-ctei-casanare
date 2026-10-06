/* ÚNICO archivo que sabe dónde viven los datos: Supabase (Postgres + Auth).
   Las vistas y el núcleo leen de una caché síncrona que se llena en iniciar();
   las escrituras van al servidor, que aplica las reglas de seguridad (RLS). */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';

let cliente = null;
let cache = null;

function db() {
  if (cliente) return cliente;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !window.supabase) {
    throw new Error('Falta configurar la conexión con Supabase en js/config.js');
  }
  cliente = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  return cliente;
}

/* Lee todas las filas de una consulta, en bloques (PostgREST limita a 1000 por petición). */
async function todas(consulta) {
  const filas = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await consulta().range(desde, desde + 999);
    if (error) throw error;
    filas.push(...data);
    if (data.length < 1000) return filas;
  }
}

const aUsuario = p => ({ id: p.id, nombre: p.nombre, correo: p.correo, entidad: p.entidad, rol: p.rol, creado: p.creado });
const aIntento = a => ({ id: a.id, usuarioId: a.usuario_id, moduloId: a.modulo_id, nota: a.nota,
  correctas: a.correctas, total: a.total, respuestas: a.respuestas, fecha: a.fecha });

export async function iniciar({ recargar = false } = {}) {
  if (cache && !recargar) return cache;
  const s = db();
  const { data: { session } } = await s.auth.getSession();
  cache = { sesion: null, usuarios: [], progreso: {}, intentos: [], claves: {} };
  if (!session) return cache;

  const { data: perfil, error } = await s.from('perfiles').select('*').eq('id', session.user.id).maybeSingle();
  if (error) throw error;
  if (!perfil) { await s.auth.signOut(); return cache; }
  cache.sesion = perfil.id;

  const admin = perfil.rol === 'admin';
  // RLS ya limita lo que cada quien puede leer; los filtros evitan traer de más.
  const [perfiles, progreso, intentos, claves] = await Promise.all([
    admin ? todas(() => s.from('perfiles').select('*').order('creado')) : [perfil],
    todas(() => { const q = s.from('progreso').select('usuario_id,modulo_id,seccion'); return admin ? q : q.eq('usuario_id', perfil.id); }),
    todas(() => { const q = s.from('intentos').select('*').order('fecha'); return admin ? q : q.eq('usuario_id', perfil.id); }),
    admin ? todas(() => s.from('claves').select('*').order('orden')) : []
  ]);

  cache.usuarios = perfiles.map(aUsuario);
  for (const p of progreso) {
    (cache.progreso[p.usuario_id] ||= {})[p.modulo_id + ':' + p.seccion] = true;
  }
  cache.intentos = intentos.map(aIntento);
  for (const c of claves) (cache.claves[c.modulo_id] ||= [])[c.orden] = c;
  return cache;
}

export function datos() { return cache; }

/* ---- autenticación ---- */
export async function ingresar(correo, clave) {
  const { error } = await db().auth.signInWithPassword({ email: correo, password: clave });
  if (error) return { ok: false, error };
  await iniciar({ recargar: true });
  return { ok: true };
}

export async function registrar({ correo, clave, nombre, entidad, aceptoDatos }) {
  const { data, error } = await db().auth.signUp({
    email: correo, password: clave,
    options: {
      data: { nombre, entidad, acepto_datos: aceptoDatos ? 'true' : 'false' },
      emailRedirectTo: new URL('index.html', location.href.replace(/paginas\/.*$/, '')).href
    }
  });
  if (error) return { ok: false, error };
  // Si el proyecto exige confirmar el correo, no hay sesión hasta que lo confirme.
  if (!data.session) return { ok: true, confirmar: true };
  await iniciar({ recargar: true });
  return { ok: true };
}

export async function recuperarClave(correo, volverA) {
  const { error } = await db().auth.resetPasswordForEmail(correo, { redirectTo: volverA });
  return error ? { ok: false, error } : { ok: true };
}

export async function cambiarClave(nueva) {
  const { error } = await db().auth.updateUser({ password: nueva });
  return error ? { ok: false, error } : { ok: true };
}

/* Llama a fn() cuando el usuario llega desde el enlace de recuperación de contraseña. */
export function alRecuperarClave(fn) {
  db().auth.onAuthStateChange(evento => { if (evento === 'PASSWORD_RECOVERY') fn(); });
}

export async function cerrarSesion() {
  await db().auth.signOut();
  cache = null;
  try { sessionStorage.removeItem('ctei_ultimo_resultado'); } catch (e) {}
}

/* ---- usuarios ---- */
export function usuarios() { return cache.usuarios; }
export function usuarioActual() {
  return cache && cache.sesion ? cache.usuarios.find(u => u.id === cache.sesion) || null : null;
}

/* ---- progreso ---- */
export function progresoDe(usuarioId) { return cache.progreso[usuarioId] || {}; }
export async function marcarSeccion(usuarioId, moduloId, seccion) {
  const p = (cache.progreso[usuarioId] ||= {});
  const clave = moduloId + ':' + seccion;
  if (p[clave]) return;
  const { error } = await db().from('progreso')
    .upsert({ usuario_id: usuarioId, modulo_id: moduloId, seccion }, { ignoreDuplicates: true });
  if (error) throw error;
  p[clave] = true;
}

/* ---- intentos de evaluación ---- */
export function intentos() { return cache.intentos; }
export function intentosDe(usuarioId, moduloId) {
  return cache.intentos.filter(a => a.usuarioId === usuarioId && (!moduloId || a.moduloId === moduloId));
}

/* Envía las respuestas; el servidor califica, registra el intento y solo entonces
   devuelve las respuestas correctas y la retroalimentación. */
export async function presentarEvaluacion(moduloId, respuestas) {
  const { data, error } = await db().rpc('presentar_evaluacion', { p_modulo: moduloId, p_respuestas: respuestas });
  if (error) return { ok: false, error: error.message };
  cache.intentos.push(aIntento({ ...data, usuario_id: cache.sesion, modulo_id: moduloId, fecha: new Date().toISOString() }));
  return { ok: true, resultado: data };
}

/* Respuestas correctas por módulo. Solo llegan con el perfil de coordinación. */
export function claves() { return cache.claves; }

/* ---- resultado del último intento (para la pantalla de resultado) ---- */
export function guardarUltimoResultado(r) {
  try { sessionStorage.setItem('ctei_ultimo_resultado', JSON.stringify(r)); } catch (e) {}
}
export function ultimoResultado() {
  try { return JSON.parse(sessionStorage.getItem('ctei_ultimo_resultado')); } catch (e) { return null; }
}
