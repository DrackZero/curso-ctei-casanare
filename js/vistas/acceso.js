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
      <div class="campo"><label for="f-correo">Correo electrónico</label><input id="f-correo" name="correo" type="email" autocomplete="email" maxlength="254" required placeholder="nombre@correo.com"><span class="aviso-campo" id="sugerencia-correo" role="status"></span></div>`}
      ${modo === 'recuperar' ? '' : campoClave('f-clave', 'clave', modo === 'nueva' ? 'Nueva contraseña' : 'Contraseña',
        entrar ? 'current-password' : 'new-password', entrar ? '' : `Mínimo ${sesion.CLAVE_MINIMA} caracteres, con letras y números`)}
      ${modo === 'registro' || modo === 'nueva' ? `
      <ul class="requisitos" id="requisitos" aria-live="polite">
        <li data-req="largo">Al menos ${sesion.CLAVE_MINIMA} caracteres</li>
        <li data-req="letra">Contiene letras</li>
        <li data-req="numero">Contiene números</li>
        <li data-req="espacios">Sin espacios al inicio ni al final</li>
      </ul>
      ${campoClave('f-clave2', 'clave2', 'Repita la contraseña', 'new-password', 'Escríbala de nuevo')}` : ''}
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

/* Campo de contraseña con botón para mostrarla y aviso de mayúsculas activadas. */
function campoClave(id, nombre, etiqueta, autocompletar, ayuda) {
  return `
      <div class="campo">
        <label for="${id}">${etiqueta}</label>
        <div class="clave-envoltura">
          <input id="${id}" name="${nombre}" type="password" autocomplete="${autocompletar}" maxlength="72" required placeholder="${esc(ayuda)}">
          <button type="button" class="ver-clave" data-ver="${id}" aria-controls="${id}" aria-pressed="false">Mostrar</button>
        </div>
        <span class="aviso-campo" data-aviso="${id}" role="status"></span>
      </div>`;
}

/* Errores frecuentes de digitación en dominios de correo. */
const DOMINIOS = { 'gmial.com':'gmail.com', 'gmai.com':'gmail.com', 'gmal.com':'gmail.com', 'gmail.co':'gmail.com', 'gmail.con':'gmail.com',
  'hotmial.com':'hotmail.com', 'hotmal.com':'hotmail.com', 'hotmail.co':'hotmail.com', 'hotmail.con':'hotmail.com',
  'outlok.com':'outlook.com', 'outlook.co':'outlook.com', 'yaho.com':'yahoo.com', 'yahoo.co':'yahoo.com' };

function sugerenciaCorreo(correo) {
  const [usuario, dominio] = String(correo).trim().toLowerCase().split('@');
  return usuario && DOMINIOS[dominio] ? usuario + '@' + DOMINIOS[dominio] : null;
}

function avisar(id, texto) {
  const e = document.querySelector(`[data-aviso="${id}"]`);
  if (e) e.textContent = texto || '';
}

/* Revisión antes de enviar: devuelve [campo, mensaje] del primer problema, o null. */
function revisar(f) {
  if (modo === 'registro' && f.nombre.value.trim().split(/\s+/).filter(Boolean).length < 2)
    return [f.nombre, 'Escriba su nombre y al menos un apellido.'];
  if (f.correo) {
    const c = f.correo.value.trim();
    if (!c) return [f.correo, 'Escriba su correo electrónico.'];
    if (/\s/.test(c)) return [f.correo, 'El correo no puede tener espacios.'];
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c)) return [f.correo, 'El correo no parece válido. Revise que tenga @ y un dominio (por ejemplo, nombre@gmail.com).'];
  }
  if (f.clave) {
    if (!f.clave.value) return [f.clave, 'Escriba la contraseña.'];
    if (modo === 'registro' || modo === 'nueva') {
      if (f.clave.value !== f.clave.value.trim()) return [f.clave, 'La contraseña tiene espacios al inicio o al final. Quítelos para evitar errores al ingresar.'];
      const mala = sesion.validarClave(f.clave.value);
      if (mala) return [f.clave, mala];
      if (f.clave.value !== f.clave2.value) return [f.clave2, 'Las dos contraseñas no coinciden. Use «Mostrar» para revisarlas.'];
    }
  }
  if (modo === 'registro' && !f.acepto.checked) return [f.acepto, 'Debe autorizar el tratamiento de sus datos personales para inscribirse.'];
  return null;
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

  // Mostrar u ocultar la contraseña
  f.querySelectorAll('[data-ver]').forEach(b => b.addEventListener('click', () => {
    const campo = document.getElementById(b.dataset.ver);
    const ver = campo.type === 'password';
    campo.type = ver ? 'text' : 'password';
    b.textContent = ver ? 'Ocultar' : 'Mostrar';
    b.setAttribute('aria-pressed', String(ver));
    campo.focus();
  }));

  // Aviso de mayúsculas activadas
  f.querySelectorAll('input[type="password"]').forEach(campo => {
    const MAYUS = 'Atención: las mayúsculas están activadas.';
    const aviso = document.querySelector(`[data-aviso="${campo.id}"]`);
    const quitar = () => { if (aviso.textContent === MAYUS) avisar(campo.id, ''); };
    const revisarMayus = e => {
      if (!e.getModifierState) return;
      if (e.getModifierState('CapsLock')) avisar(campo.id, MAYUS); else quitar();
    };
    campo.addEventListener('keyup', revisarMayus);
    campo.addEventListener('keydown', revisarMayus);
    campo.addEventListener('blur', quitar);
  });

  // Sugerencia de corrección del correo («¿Quiso decir…?»)
  if (f.correo) f.correo.addEventListener('blur', () => {
    const sug = sugerenciaCorreo(f.correo.value);
    const e = document.getElementById('sugerencia-correo');
    if (!e) return;
    e.innerHTML = sug ? `¿Quiso decir <button type="button" class="btn-enlace">${esc(sug)}</button>?` : '';
    const b = e.querySelector('button');
    if (b) b.addEventListener('click', () => { f.correo.value = sug; e.innerHTML = ''; });
  });

  // Requisitos de la contraseña en vivo y coincidencia de las dos
  const lista = document.getElementById('requisitos');
  const actualizar = () => {
    if (!lista) return;
    const v = f.clave.value;
    const ok = { largo: v.length >= sesion.CLAVE_MINIMA, letra: /[a-zA-Z]/.test(v), numero: /[0-9]/.test(v), espacios: v.length > 0 && v === v.trim() };
    lista.querySelectorAll('[data-req]').forEach(li => li.classList.toggle('cumple', ok[li.dataset.req]));
    if (f.clave2.value) avisar('f-clave2', f.clave2.value === v ? '✓ Las contraseñas coinciden.' : 'Las contraseñas aún no coinciden.');
  };
  if (lista) { f.clave.addEventListener('input', actualizar); f.clave2.addEventListener('input', actualizar); }

  f.querySelectorAll('input').forEach(i => i.addEventListener('input', () => i.removeAttribute('aria-invalid')));

  f.addEventListener('submit', async ev => {
    ev.preventDefault();
    const err = document.getElementById('acceso-err');
    const boton = f.querySelector('button[type="submit"]');
    err.textContent = '';
    const problema = revisar(f);
    if (problema) {
      const [campo, texto] = problema;
      err.textContent = texto;
      campo.setAttribute('aria-invalid', 'true');
      campo.focus();
      return;
    }
    boton.disabled = true;
    boton.dataset.texto = boton.textContent;
    boton.textContent = 'Un momento…';
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
      if (boton.dataset.texto) boton.textContent = boton.dataset.texto;
    }
  });
}

try { almacen.alRecuperarClave(() => { modo = 'nueva'; mensajeOk = ''; pintar(); }); } catch (e) { /* sin configurar: pintar() lo informa */ }
pintar();
