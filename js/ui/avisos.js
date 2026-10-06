/* Notificación breve en la parte inferior de la pantalla. */

let temporizador;

export function notificar(texto) {
  const e = document.getElementById('aviso');
  if (!e) return;
  e.textContent = texto;
  e.hidden = false;
  clearTimeout(temporizador);
  temporizador = setTimeout(() => { e.hidden = true; }, 2800);
}
