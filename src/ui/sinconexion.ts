import { boton, h } from './dom';

/*
 * «Instalar como app» al final del calendario (adaptado de `netlify/herramientas/sinconexion.ts`).
 * No hay botón de descarga: el service worker guarda la app solo y se actualiza cada vez que
 * se abre con internet (ver `main.ts`), y el calendario se copia en el teléfono en cada descarga.
 */

interface EventoInstalar extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let aviso: EventoInstalar | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    aviso = e as EventoInstalar;
  });
  window.addEventListener('appinstalled', () => (aviso = null));
}

/** ¿Se está usando como app instalada? (la pantalla completa del navegador no cuenta). */
const instalada = () => {
  if ((navigator as Navigator & { standalone?: boolean }).standalone) return true;
  if (typeof matchMedia !== 'function') return false;
  if (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: minimal-ui)').matches) return true;
  return matchMedia('(display-mode: fullscreen)').matches && !document.fullscreenElement;
};
/** Los botones tienen `display` propio en el CSS: `hidden` no basta para ocultarlos. */
const ocultar = (el: HTMLElement) => (el.style.display = 'none');
const esIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Tarjeta «Instalar como app»: botón si el navegador lo permite o, si no, los pasos a seguir. */
export function opcionesSinConexion(): HTMLElement {
  const instalar = boton('Instalar como app', async () => {
    if (aviso) {
      await aviso.prompt();
      const r = await aviso.userChoice;
      aviso = null;
      instalarTexto.textContent = r.outcome === 'accepted' ? '¡Instalado! Ábrelo desde tu pantalla de inicio.' : 'Puedes instalarlo cuando quieras.';
      ocultar(instalar);
    }
  }, { icono: '📲', variante: 'primario' });
  const instalarTexto = h('p', { class: 'ayuda-texto' });
  if (instalada()) {
    ocultar(instalar);
    instalarTexto.textContent = 'Ya lo tienes instalado como app.';
  } else if (!aviso) {
    ocultar(instalar);
    instalarTexto.textContent = esIos()
      ? 'Para instalarlo en iPhone o iPad: botón Compartir de Safari → «Añadir a pantalla de inicio».'
      : 'Para instalarlo: menú del navegador → «Instalar app» o «Añadir a pantalla de inicio».';
  }

  return h(
    'div',
    { class: 'opcion-config' },
    h('span', { class: 'etiqueta', text: '📲 Instalar como app' }),
    instalar,
    instalarTexto,
    h('p', { class: 'ayuda-texto', text: 'Cada vez que lo abres con internet se guarda la última versión, para verlo también sin conexión.' }),
  );
}
