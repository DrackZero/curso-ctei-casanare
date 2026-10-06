/* Gráficas del panel y del informe.
   Construidas en HTML y CSS, sin librerías: pesan casi nada, se imprimen
   nítidas en el PDF y funcionan sin conexión.

   Reglas de diseño que siguen todas (ver css/graficas.css):
   · barras de 18 px, extremo de dato redondeado y base recta
   · una sola serie = un solo color; el texto nunca lleva el color del dato
   · cuadrícula de línea fina y continua; referencia con etiqueta propia
   · cada gráfica trae su tabla de datos equivalente (accesibilidad)
   · tooltips por barra, también con teclado */

import { esc } from './componentes.js';

const pctDe = (v, max) => max > 0 ? Math.max(0, Math.min(100, v / max * 100)) : 0;

/* ---------- barras horizontales ---------- */
/**
 * @param {object} o
 * @param {Array}  o.filas   [{ etiqueta, sub?, valor, texto, color?, punto?, tip?, marca?:{texto} , grupo? }]
 * @param {number} o.max     valor máximo del eje
 * @param {object} [o.referencia] { valor, texto }
 * @param {Array}  [o.marcasEje]  valores de la cuadrícula, ej. [0,25,50,75,100]
 * @param {string} [o.sufijo]     sufijo de los valores del eje, ej. '%'
 */
export function barrasH({ filas, max, referencia = null, marcasEje = null, sufijo = '' }) {
  const eje = marcasEje || [0, max / 2, max];
  const refPct = referencia ? pctDe(referencia.valor, max) : null;
  let grupoActual = null;

  const cuerpo = filas.map(f => {
    let cabeza = '';
    if (f.grupo && f.grupo !== grupoActual) {
      grupoActual = f.grupo;
      cabeza = `<div class="gb-grupo">${esc(f.grupo)}</div>`;
    }
    const ancho = pctDe(f.valor, max);
    const color = f.color || 'var(--graf-serie)';
    return `${cabeza}
    <div class="gb-fila${f.marca ? ' gb-marcada' : ''}">
      <div class="gb-etq">
        ${f.punto ? `<i class="gb-punto" style="background:${f.punto}"></i>` : ''}
        <span class="gb-txt"><span class="gb-nom">${esc(f.etiqueta)}</span>${f.sub ? `<span class="gb-sub">${esc(f.sub)}</span>` : ''}</span>
      </div>
      <div class="gb-pista">
        <span class="gb-barra" tabindex="0" role="img" aria-label="${esc(f.etiqueta)}: ${esc(f.texto)}"
              data-tip="${esc(f.tip || f.etiqueta + ' · ' + f.texto)}"
              style="width:${ancho}%;background:${color}"></span>
        <span class="gb-val" style="left:${ancho}%">${esc(f.texto)}${f.marca ? ` <b class="gb-alerta"><i aria-hidden="true">▲</i>${esc(f.marca.texto)}</b>` : ''}</span>
      </div>
    </div>`;
  }).join('');

  return `
  <div class="gb" style="--ref:${refPct ?? 0}%">
    <div class="gb-rejilla" aria-hidden="true">
      ${eje.map(v => `<span style="left:${pctDe(v, max)}%"></span>`).join('')}
      ${refPct !== null ? `<em class="gb-ref" style="left:${refPct}%"><b>${esc(referencia.texto)}</b></em>` : ''}
    </div>
    ${cuerpo}
    <div class="gb-eje" aria-hidden="true">
      <div></div>
      <div class="gb-eje-marcas">${eje.map(v => `<span style="left:${pctDe(v, max)}%">${Math.round(v)}${sufijo}</span>`).join('')}</div>
    </div>
  </div>`;
}

/* ---------- columnas (distribuciones) ---------- */
/**
 * @param {object} o
 * @param {Array}  o.filas  [{ etiqueta, sub?, valor, color, tip? }]
 * @param {object} [o.corte] { despuesDe: índice, texto } — línea de referencia entre dos columnas
 */
export function columnas({ filas, corte = null }) {
  const max = Math.max(1, ...filas.map(f => f.valor));
  const paso = max <= 5 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : max <= 50 ? 10 : 20;
  const tope = Math.ceil(max / paso) * paso;
  const marcas = [];
  for (let v = 0; v <= tope; v += paso) marcas.push(v);

  return `
  <div class="gc">
    <div class="gc-lienzo">
      <div class="gc-rejilla" aria-hidden="true">
        ${marcas.map(v => `<span style="bottom:${v / tope * 100}%"><i>${v}</i></span>`).join('')}
      </div>
      <div class="gc-cols">
        ${filas.map((f, i) => `
          <div class="gc-col">
            <span class="gc-val" style="bottom:${f.valor / tope * 100}%">${f.valor}</span>
            <span class="gc-barra" tabindex="0" role="img" aria-label="${esc(f.etiqueta)}: ${f.valor}"
                  data-tip="${esc(f.tip || f.etiqueta + ' · ' + f.valor)}"
                  style="height:${f.valor / tope * 100}%;background:${f.color || 'var(--graf-serie)'}"></span>
          </div>
          ${corte && corte.despuesDe === i ? `<div class="gc-corte" aria-hidden="true"><b>${esc(corte.texto)}</b></div>` : ''}`).join('')}
      </div>
    </div>
    <div class="gc-ejex">
      ${filas.map((f, i) => `<div class="gc-x"><b>${esc(f.etiqueta)}</b>${f.sub ? `<span>${esc(f.sub)}</span>` : ''}</div>
        ${corte && corte.despuesDe === i ? '<div class="gc-corte-hueco"></div>' : ''}`).join('')}
    </div>
  </div>`;
}

/* ---------- leyenda (solo cuando hay 2 o más series) ---------- */
export function leyenda(items) {
  return `<div class="g-leyenda">${items.map(([color, texto]) =>
    `<span><i style="background:${color}"></i>${esc(texto)}</span>`).join('')}</div>`;
}

/* ---------- tabla equivalente ---------- */
export function tablaDatos({ titulo = 'Ver tabla de datos', columnas, filas, numericas = [] , abierta = false }) {
  return `
  <details class="g-tabla"${abierta ? ' open' : ''}>
    <summary>${esc(titulo)}</summary>
    <div class="tabla-env"><table>
      <thead><tr>${columnas.map((c, i) => `<th${numericas.includes(i) ? ' class="n"' : ''}>${esc(c)}</th>`).join('')}</tr></thead>
      <tbody>${filas.map(f => `<tr>${f.map((v, i) => `<td${numericas.includes(i) ? ' class="n"' : ''}>${v ?? '—'}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>
  </details>`;
}

/* ---------- tarjeta contenedora ---------- */
export function tarjeta({ id = '', titulo, descripcion = '', grafica, pie = '', ancho = false }) {
  return `
  <section class="g-tarjeta${ancho ? ' g-ancha' : ''}"${id ? ` id="${id}"` : ''}>
    <header>
      <h3>${esc(titulo)}</h3>
      ${descripcion ? `<p>${descripcion}</p>` : ''}
    </header>
    ${grafica}
    ${pie}
  </section>`;
}

/* ---------- tooltips compartidos (ratón y teclado) ---------- */
let globo = null;
export function activarTooltips(raiz = document) {
  if (!globo) {
    globo = document.createElement('div');
    globo.className = 'g-globo';
    globo.setAttribute('role', 'status');
    globo.hidden = true;
    document.body.appendChild(globo);
  }
  const mostrar = (el, x, y) => {
    globo.textContent = el.dataset.tip;
    globo.hidden = false;
    const r = globo.getBoundingClientRect();
    const px = Math.min(window.innerWidth - r.width - 8, Math.max(8, x - r.width / 2));
    globo.style.left = px + 'px';
    globo.style.top = Math.max(8, y - r.height - 12) + 'px';
  };
  const ocultar = () => { globo.hidden = true; };
  raiz.querySelectorAll('[data-tip]').forEach(el => {
    el.addEventListener('mousemove', e => mostrar(el, e.clientX, e.clientY));
    el.addEventListener('mouseleave', ocultar);
    el.addEventListener('focus', () => {
      const r = el.getBoundingClientRect();
      mostrar(el, r.left + r.width / 2, r.top);
    });
    el.addEventListener('blur', ocultar);
  });
}
