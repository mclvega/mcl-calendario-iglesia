import './style.css';

import { app } from './app';
import { descargarCalendario } from './api';
import { aplicarPreferencias, leerCopia, leerPreferencias } from './storage';
import { pantallaCalendario } from './ui/calendario';
import { pantallaConfiguracion } from './ui/configuracion';

aplicarPreferencias(leerPreferencias());

// Primero se muestra la última copia guardada (carga instantánea y sin conexión) y luego se actualiza.
const copia = leerCopia();
if (copia) {
  app.datos = copia.datos;
  app.fechaDatos = copia.fecha;
}

app.raiz = document.getElementById('app')!;
app.registrar('calendario', pantallaCalendario);
app.registrar('configuracion', pantallaConfiguracion);
app.ir('calendario');

let actualizando = false;
async function actualizar(): Promise<void> {
  // En Configuración no se pisan los datos que se están editando.
  if (actualizando || app.actual !== 'calendario') return;
  actualizando = true;
  try {
    app.datos = await descargarCalendario();
    app.fechaDatos = Date.now();
    app.sinConexion = false;
  } catch {
    app.sinConexion = true;
  } finally {
    actualizando = false;
  }
  app.refrescarCalendario();
}

void actualizar();
// Al volver a la app (p. ej. desde otra pestaña o al desbloquear el móvil) se busca el calendario al día.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void actualizar();
});
window.addEventListener('online', () => void actualizar());

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}
