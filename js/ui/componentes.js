/* Piezas visuales reutilizables. Devuelven HTML como texto. */

export const esc = s => String(s).replace(/[&<>"']/g, c => (
  { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]
));

export const iniciales = n => String(n).trim().split(/\s+/).map(w => w[0]).slice(0,2).join('').toUpperCase();

export const fecha = iso => new Date(iso).toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' });

export const pastilla = (texto, clase) => `<span class="pastilla ${clase}">${esc(texto)}</span>`;

export const barra = (porcentaje) => `<span class="barra"><span style="width:${porcentaje}%"></span></span>`;

export const cifra = (valor, etiqueta) =>
  `<div class="cifra"><span class="v">${valor}</span><span class="k">${esc(etiqueta)}</span></div>`;

/* Visor de imagen a pantalla completa */
export function abrirLupa(src, alt = '') {
  const l = document.getElementById('lupa');
  if (!l) return;
  l.className = 'lupa';
  l.innerHTML = `<button class="cerrar" type="button">Cerrar ✕</button><img src="${src}" alt="${esc(alt)}">`;
  const cerrar = () => { l.className = ''; l.innerHTML = ''; document.removeEventListener('keydown', tecla); };
  const tecla = e => { if (e.key === 'Escape') cerrar(); };
  l.addEventListener('click', cerrar);
  document.addEventListener('keydown', tecla);
}

/* Parámetro de la URL, por ejemplo modulo.html?m=m2 */
export const parametro = (nombre) => new URLSearchParams(location.search).get(nombre);
