import { h } from './dom';

/*
 * Ícono de calendario propio, sin letras. El emoji 📅 se dibuja en iPhone y en Android
 * con texto en inglés («JUL 17»), y todo debe verse en español.
 * Mismo diseño que el ícono de la app (netlify/herramientas/iconos.mjs → «calendario»).
 */
const SVG_CALENDARIO = `<svg viewBox="0 0 24 24" width="1em" height="1em" focusable="false">
  <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" fill="#faf6ee" stroke="#c9bea8" stroke-width="1"/>
  <path d="M3 7a2.5 2.5 0 0 1 2.5-2.5h13A2.5 2.5 0 0 1 21 7v2.5H3z" fill="#d32f2f"/>
  <rect x="7" y="2.5" width="2" height="4.5" rx="1" fill="#9e9e9e"/>
  <rect x="15" y="2.5" width="2" height="4.5" rx="1" fill="#9e9e9e"/>
  <g fill="#1746b8">
    <rect x="5.5" y="11.5" width="3.5" height="2.8" rx=".5"/>
    <rect x="10.25" y="11.5" width="3.5" height="2.8" rx=".5"/>
    <rect x="15" y="11.5" width="3.5" height="2.8" rx=".5"/>
    <rect x="5.5" y="16" width="3.5" height="2.8" rx=".5"/>
    <rect x="15" y="16" width="3.5" height="2.8" rx=".5"/>
  </g>
  <rect x="10.25" y="16" width="3.5" height="2.8" rx=".5" fill="#ffc107"/>
</svg>`;

export function iconoCalendario(): HTMLElement {
  return h('span', { class: 'icono-svg', 'aria-hidden': 'true', html: SVG_CALENDARIO });
}
