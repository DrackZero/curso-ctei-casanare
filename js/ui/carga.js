/* Pantalla de carga. El HTML de cada página trae <div id="carga"> con sus estilos en
   línea, así se ve desde el primer instante. Este módulo:
   - la retira cuando el contenido principal termina de dibujarse;
   - la vuelve a mostrar al pulsar un enlace interno, mientras llega la página siguiente. */

const CONTENEDORES = ['contenido', 'acceso', 'informe'];
const ESPERA_MAXIMA = 20000;   // por si algo falla, nunca dejar la pantalla bloqueada

function pantalla() {
  let c = document.getElementById('carga');
  if (!c) {
    c = document.createElement('div');
    c.id = 'carga';
    c.className = 'carga saliendo';
    c.setAttribute('role', 'status');
    c.setAttribute('aria-live', 'polite');
    c.innerHTML = '<div class="carga-circulo" aria-hidden="true"></div><div class="carga-texto">Cargando…</div>';
    document.body.appendChild(c);
  }
  return c;
}

export function ocultarCarga() {
  const c = document.getElementById('carga');
  if (c) c.classList.add('saliendo');
}

export function mostrarCarga() {
  const c = pantalla();
  void c.offsetWidth;            // reinicia la transición
  c.classList.remove('saliendo');
}

function vigilar() {
  const destinos = CONTENEDORES.map(id => document.getElementById(id)).filter(Boolean);
  const listo = () => destinos.some(d => d.childElementCount > 0);
  if (listo()) { ocultarCarga(); return; }
  const obs = new MutationObserver(() => { if (listo()) { obs.disconnect(); ocultarCarga(); } });
  destinos.forEach(d => obs.observe(d, { childList: true }));
  setTimeout(() => { obs.disconnect(); ocultarCarga(); }, ESPERA_MAXIMA);
}

/* Enlaces internos: se muestra la pantalla de inmediato al salir de la página. */
document.addEventListener('click', e => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest('a[href]');
  if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
  const destino = new URL(a.href, location.href);
  if (destino.origin !== location.origin) return;
  if (destino.pathname === location.pathname && destino.search === location.search) return;   // anclas
  if (!/\.html$|\/$/.test(destino.pathname)) return;   // PDF, imágenes y otros archivos
  mostrarCarga();
});

/* Al volver con el botón «Atrás», el navegador puede restaurar la página tal como quedó. */
window.addEventListener('pageshow', e => { if (e.persisted) ocultarCarga(); });

vigilar();
