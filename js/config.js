/* Configuración general de la plataforma.
   Un solo lugar para las constantes que cambian entre entornos. */

/* Raíz del sitio, calculada desde la ubicación de este archivo (js/config.js).
   Gracias a esto las páginas funcionan igual estén en la raíz o en paginas/,
   y el sitio puede publicarse en un subdirectorio de GitHub Pages. */
export const BASE = new URL('../', import.meta.url).href;

/* Devuelve la ruta completa de un recurso del proyecto.
   recurso('assets/img/marca/escudo-casanare.png') */
export const recurso = (ruta) => BASE + String(ruta).replace(/^\/+/, '');

export const RUTA_CONTENIDO = BASE + 'contenido/';
export const UMBRAL_DEFECTO = 70;

/* Conexión con Supabase (Settings → API del proyecto).
   La clave «anon / publishable» es pública por diseño: lo que protege los datos son
   las políticas RLS de supabase/esquema.sql. NUNCA poner aquí la clave service_role. */
export const SUPABASE_URL = 'https://csfcugfczltvwqmgwnro.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_4FinXjAEBnmwCFsB3eZ_zQ_73LrYvfR';

export const PAGINAS = {
  acceso:     BASE,
  inicio:     BASE + 'paginas/inicio.html',
  modulo:     BASE + 'paginas/modulo.html',
  evaluacion: BASE + 'paginas/evaluacion.html',
  resultado:  BASE + 'paginas/resultado.html',
  notas:      BASE + 'paginas/notas.html',
  admin:      BASE + 'paginas/admin.html',
  revision:   BASE + 'paginas/revision.html',
  reporte:    BASE + 'paginas/reporte.html',
  privacidad: BASE + 'paginas/privacidad.html'
};

export const ENLACES_INSTITUCIONALES = {
  facebook:  '',
  x:         '',
  instagram: '',
  youtube:   '',
  linkedin:  '',
  novedades: '',
  relevo:    '',
  accesibilidad: ''
};
