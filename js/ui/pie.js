/* Pie institucional: banda de valores CTeI + datos de contacto. */

import { ENLACES_INSTITUCIONALES, recurso } from '../config.js';
import { notificar } from './avisos.js';

export function pintarPie(contenedor) {
  contenedor.innerHTML = `
  <footer class="pie-inst">
    <div class="banda">
      <div class="bv-items">
        <div class="bv"><span class="ic"><i class="fa-solid fa-people-group">◍</i></span><span class="tx"><b>ALIANZAS</b><span>que transforman</span></span></div>
        <div class="bv"><span class="ic"><i class="fa-solid fa-lightbulb">◍</i></span><span class="tx"><b>INNOVACIÓN</b><span>que conecta</span></span></div>
        <div class="bv"><span class="ic"><i class="fa-solid fa-chart-column">◍</i></span><span class="tx"><b>CONOCIMIENTO</b><span>que impulsa</span></span></div>
        <div class="bv"><span class="ic"><i class="fa-solid fa-leaf">◍</i></span><span class="tx"><b>FUTURO</b><span>que construimos</span></span></div>
      </div>
      <div class="bv-marca">
        <span class="t">CTEI CASANARE</span>
        <span class="s">Innovamos hoy,<br>transformamos el mañana.</span>
      </div>
    </div>

    <div class="pie-in">
      <div>
        <div class="marca-pie">
          <img src="${recurso('assets/img/marca/escudo-casanare.png')}" alt="" style="height:38px">
          <div>
            <div style="font-family:var(--display);font-weight:700;font-size:.86rem;color:var(--gob-osc)">Gobernación de Casanare</div>
            <div style="font-size:.76rem;color:var(--muted)">Dpto. Administrativo de Planeación</div>
          </div>
        </div>
        <p>Carrera 20 n.º 8-02, Yopal, Casanare<br>Código postal 850001</p>
      </div>
      <div>
        <h4>Atención al ciudadano</h4>
        <p>Lunes a viernes<br>7:00 a. m. – 12:00 m. y 2:00 – 6:00 p. m.<br>Línea (608) 635 8000</p>
      </div>
      <div>
        <h4>El curso</h4>
        <ul>
          <li>Innovación pública y proyectos CTeI</li>
          <li>48 horas · virtual asincrónico</li>
          <li>Inscripción gratuita</li>
        </ul>
      </div>
      <div>
        <h4>Políticas</h4>
        <ul>
          <li>Tratamiento de datos personales</li>
          <li>Términos y condiciones de uso</li>
          <li>Política de accesibilidad web</li>
        </ul>
      </div>
    </div>

    <div class="pie-legal"><div class="pie-legal-in">
      <span>© ${new Date().getFullYear()} Gobernación de Casanare · Todos los derechos reservados</span>
      <span>Datos de contacto de muestra</span>
    </div></div>
  </footer>`;
}

/* Barra lateral fija de enlaces institucionales */
export function pintarLateral(contenedor) {
  const items = [
    ['facebook','az','fa-brands fa-facebook-f','f','Facebook'],
    ['x','vc','fa-brands fa-x-twitter','X','X'],
    ['instagram','az','fa-brands fa-instagram','IG','Instagram'],
    ['youtube','vc','fa-brands fa-youtube','YT','YouTube'],
    ['linkedin','az','fa-brands fa-linkedin-in','in','LinkedIn'],
    ['novedades','az','fa-solid fa-rss','RSS','Novedades'],
    [null,null,null,null,null],
    ['relevo','ve','fa-solid fa-hands-asl-interpreting','✋','Centro de Relevo'],
    ['accesibilidad','az','fa-solid fa-universal-access','♿','Accesibilidad']
  ];
  contenedor.className = 'lateral';
  contenedor.setAttribute('aria-label', 'Enlaces institucionales');
  contenedor.innerHTML = items.map(([clave, color, icono, respaldo, nombre]) =>
    clave === null ? '<span class="sep"></span>' :
    `<a href="${ENLACES_INSTITUCIONALES[clave] || '#'}" class="${color}" data-red="${nombre}" aria-label="${nombre}">
       <i class="${icono}">${respaldo}</i><span class="glb">${nombre}</span></a>`
  ).join('');

  contenedor.querySelectorAll('[data-red]').forEach(a => a.addEventListener('click', e => {
    if (!a.getAttribute('href') || a.getAttribute('href') === '#') {
      e.preventDefault();
      notificar(a.dataset.red + ': pendiente de enlazar con el perfil oficial de la Gobernación');
    }
  }));
}
