/* Pantalla de carga. El HTML de cada página ya trae <div id="carga">, que se ve
   desde el primer instante; este módulo lo retira con una transición cuando el
   contenido principal termina de dibujarse. */

const CONTENEDORES = ['contenido', 'acceso', 'informe'];
const ESPERA_MAXIMA = 20000;   // por si algo falla, nunca dejar la pantalla bloqueada

export function ocultarCarga() {
  const c = document.getElementById('carga');
  if (!c || c.classList.contains('saliendo')) return;
  c.classList.add('saliendo');
  c.setAttribute('aria-busy', 'false');
  document.body.removeAttribute('aria-busy');
  const quitar = () => c.remove();
  c.addEventListener('transitionend', quitar, { once: true });
  setTimeout(quitar, 600);
}

function vigilar() {
  const destinos = CONTENEDORES.map(id => document.getElementById(id)).filter(Boolean);
  if (destinos.some(d => d.childElementCount > 0)) { ocultarCarga(); return; }
  const obs = new MutationObserver(() => {
    if (destinos.some(d => d.childElementCount > 0)) { obs.disconnect(); ocultarCarga(); }
  });
  destinos.forEach(d => obs.observe(d, { childList: true }));
  setTimeout(() => { obs.disconnect(); ocultarCarga(); }, ESPERA_MAXIMA);
}

vigilar();
