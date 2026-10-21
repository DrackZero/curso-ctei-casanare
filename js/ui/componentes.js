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

/* Visor de imagen a pantalla completa.
   Mientras está abierto se bloquea el desplazamiento de la página de fondo, para que
   solo quede la barra del visor; el ancho de la barra se compensa para que nada salte. */
export function abrirLupa(src, alt = '') {
  const l = document.getElementById('lupa');
  if (!l) return;
  const raiz = document.documentElement;
  const barra = window.innerWidth - raiz.clientWidth;
  raiz.classList.add('lupa-abierta');
  if (barra > 0) document.body.style.paddingRight = barra + 'px';
  l.className = 'lupa';
  l.innerHTML = `<button class="cerrar" type="button">Cerrar ✕</button><img src="${src}" alt="${esc(alt)}">`;
  l.scrollTop = 0;
  const cerrar = () => {
    l.className = ''; l.innerHTML = '';
    raiz.classList.remove('lupa-abierta');
    document.body.style.paddingRight = '';
    document.removeEventListener('keydown', tecla);
  };
  const tecla = e => { if (e.key === 'Escape') cerrar(); };
  l.addEventListener('click', cerrar, { once: true });
  document.addEventListener('keydown', tecla);
}

/* Parámetro de la URL, por ejemplo modulo.html?m=m2 */
export const parametro = (nombre) => new URLSearchParams(location.search).get(nombre);
