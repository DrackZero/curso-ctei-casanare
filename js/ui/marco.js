/* Arma la página completa: encabezado, barra lateral y pie.
   Cada vista solo se ocupa de su contenido. */

import * as almacen from '../datos/almacen.js';
import * as sesion from '../nucleo/sesion.js';
import { pintarCabecera } from './cabecera.js';
import { pintarPie, pintarLateral } from './pie.js';

export async function montarMarco({ activo = '', moduloActivo = '', exigir = 'sesion' } = {}) {
  try {
    await almacen.iniciar();
  } catch (e) {
    document.getElementById('contenido').innerHTML = '<p class="err">No fue posible conectar con el servidor. Recargue la página en unos minutos.</p>';
    console.error(e);
    return null;
  }

  const usuario = exigir === 'admin' ? sesion.exigirAdmin() : sesion.exigirSesion();
  if (!usuario) return null;

  await pintarCabecera(document.getElementById('cabecera'), { activo, moduloActivo });
  pintarPie(document.getElementById('pie'));
  const lat = document.getElementById('lateral');
  if (lat) pintarLateral(lat);

  return usuario;
}
