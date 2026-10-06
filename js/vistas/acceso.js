/* Pantalla de ingreso e inscripción. */

import * as almacen from '../datos/almacen.js';
import * as contenidos from '../datos/contenidos.js';
import * as sesion from '../nucleo/sesion.js';
import { PAGINAS, recurso } from '../config.js';
import { esc } from '../ui/componentes.js';

let modo = 'entrar';      // entrar · registro · recuperar · nueva
let mensajeOk = '';

async function pintar() {
  try {
    await almacen.iniciar();
  } catch (e) {
    document.getElementById('acceso').innerHTML = `<p class="err" style="padding:2rem">${esc(e.message)}</p>`;
    return;
  }
  if (sesion.actual() && modo !== 'nueva') { location.replace(PAGINAS.inicio); return; }

  const c = await contenidos.curso();
  const mods = await contenidos.modulos();
  const entrar = modo === 'entrar';
  const raiz = document.getElementById('acceso');

  raiz.innerHTML = `
  <section class="acceso-info">
    <div class="ent">
      <img src="${recurso('assets/img/marca/escudo-casanare.png')}" alt="" style="height:46px">
      <div>
        <div class="l1">${esc(c.entidad)}</div>
        <div class="l2">${esc(c.dependencia)}</div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:.85rem">
      <span class="rotulo" style="color:var(--gob)">Curso virtual de autoformación tipo MOOC</span>
      <h1>${esc(c.nombreCorto)}</h1>
      <p class="sub">Para el fortalecimiento de capacidades territoriales en Casanare. ${mods.length} módulos de aprendizaje autónomo, con infografías, materiales de apoyo y una evaluación calificativa por módulo.</p>
    </div>
    <div class="ficha">
      <div><span class="n">${mods.length}</span><span class="t">Módulos</span></div>
      <div><span class="n">48</span><span class="t">Horas</span></div>
      <div><span class="n">${c.notaMinima}</span><span class="t">Nota mínima</span></div>
      <div><span class="n">$0</span><span class="t">Inscripción</span></div>
    </div>
    <div>
      <span class="rotulo">Ruta formativa consolidada</span>
      <div class="ruta-cinta" style="margin-top:.5rem">${c.rutaFormativa.map(r => `<span>${esc(r)}</span>`).join('')}</div>
    </div>
    <p class="pista" style="max-width:56ch">Producto final: ${esc(c.productoFinal)}.</p>
  </section>

  <section class="acceso-form">
    <form class="tarjeta-acceso" id="form-acceso" novalidate>
      ${entrar || modo === 'registro' ? `
      <div class="pestanas" role="tablist">
        <button type="button" role="tab" aria-selected="${entrar}" data-modo="entrar">Ingresar</button>
        <button type="button" role="tab" aria-selected="${!entrar}" data-modo="registro">Inscribirme</button>
      </div>` : ''}
      <div>
        <h2 style="font-size:1.25rem;font-weight:700">${TITULOS[modo][0]}</h2>
        <p class="pista">${TITULOS[modo][1]}</p>
      </div>
      ${modo !== 'registro' ? '' : `
      <div class="campo"><label for="f-nombre">Nombre completo</label><input id="f-nombre" name="nombre" autocomplete="name" maxlength="120" required placeholder="Nombre y apellidos"></div>
      <div class="campo"><label for="f-entidad">Entidad u organización <span class="pista">(opcional)</span></label><input id="f-entidad" name="entidad" autocomplete="organization" maxlength="160" placeholder="Alcaldía, universidad, empresa o independiente"></div>`}
      ${modo === 'nueva' ? '' : `
      <div class="campo"><label for="f-correo">Correo electrónico</label><input id="f-correo" name="correo" type="email" autocomplete="email" maxlength="254" required placeholder="nombre@correo.com"></div>`}
      ${modo === 'recuperar' ? '' : `
      <div class="campo"><label for="f-clave">${modo === 'nueva' ? 'Nueva contraseña' : 'Contraseña'}</label><input id="f-clave" name="clave" type="password" autocomplete="${entrar ? 'current-password' : 'new-password'}" maxlength="72" required placeholder="${entrar ? '' : `Mínimo ${sesion.CLAVE_MINIMA} caracteres, con letras y números`}"></div>`}
      ${modo !== 'registro' ? '' : `
      <label class="pista" style="display:flex;gap:.5rem;align-items:flex-start">
        <input type="checkbox" name="acepto" style="margin-top:.2rem">
        <span>Autorizo a la Gobernación de Casanare el tratamiento de mis datos personales con la finalidad de gestionar mi participación en el curso y expedir la constancia, conforme a la Ley 1581 de 2012 y la <a href="${PAGINAS.privacidad}" target="_blank" rel="noopener">política de tratamiento de datos</a>.</span>
      </label>`}
      <p class="err" id="acceso-err" role="alert"></p>
      <p class="pista" id="acceso-ok" role="status">${esc(mensajeOk)}</p>
      <button class="btn" type="submit">${TITULOS[modo][2]}</button>
      ${entrar ? `<button type="button" class="btn btn-sutil btn-sm" data-modo="recuperar">¿Olvidó su contraseña?</button>` : ''}
      ${modo === 'recuperar' ? `<button type="button" class="btn btn-sutil btn-sm" data-modo="entrar">Volver al ingreso</button>` : ''}
    </form>
  </section>`;

  conectar();
}

const TITULOS = {
  entrar:    ['Ingreso al aula', 'Use el correo con el que se inscribió al curso.', 'Ingresar'],
  registro:  ['Inscripción gratuita', 'La inscripción no tiene costo ni requisitos previos.', 'Inscribirme y comenzar'],
  recuperar: ['Recuperar contraseña', 'Le enviaremos un enlace para crear una nueva contraseña.', 'Enviar enlace'],
  nueva:     ['Nueva contraseña', 'Escriba la contraseña que usará desde ahora.', 'Guardar contraseña']
};

function conectar() {
  const f = document.getElementById('form-acceso');

  f.querySelectorAll('[data-modo]').forEach(b => b.addEventListener('click', () => { modo = b.dataset.modo; mensajeOk = ''; pintar(); }));

  f.addEventListener('submit', async ev => {
    ev.preventDefault();
    const err = document.getElementById('acceso-err');
    const boton = f.querySelector('button[type="submit"]');
    err.textContent = '';
    boton.disabled = true;
    try {
      if (modo === 'entrar') {
        const r = await sesion.ingresar(f.correo.value, f.clave.value);
        if (!r.ok) { err.textContent = r.error; return; }
        location.href = PAGINAS.inicio;
      } else if (modo === 'registro') {
        const r = await sesion.inscribir({ nombre: f.nombre.value, correo: f.correo.value, clave: f.clave.value,
          entidad: f.entidad.value, aceptoDatos: f.acepto.checked });
        if (!r.ok) { err.textContent = r.error; return; }
        if (r.confirmar) { modo = 'entrar'; mensajeOk = 'Le enviamos un correo para confirmar su cuenta. Ábralo y luego ingrese aquí.'; pintar(); return; }
        location.href = PAGINAS.inicio;
      } else if (modo === 'recuperar') {
        const r = await sesion.recuperar(f.correo.value, PAGINAS.acceso);
        if (!r.ok) { err.textContent = r.error; return; }
        modo = 'entrar'; mensajeOk = 'Si el correo está inscrito, recibirá un enlace para crear una nueva contraseña.'; pintar();
      } else if (modo === 'nueva') {
        const r = await sesion.cambiarClave(f.clave.value);
        if (!r.ok) { err.textContent = r.error; return; }
        location.href = PAGINAS.inicio;
      }
    } finally {
      boton.disabled = false;
    }
  });
}

try { almacen.alRecuperarClave(() => { modo = 'nueva'; mensajeOk = ''; pintar(); }); } catch (e) { /* sin configurar: pintar() lo informa */ }
pintar();
