import type { Datos } from './core/datos';
import { datosIniciales } from './core/semilla';

/** Navegación entre pantallas y estado compartido de la app. */

export type NombrePantalla = 'calendario' | 'configuracion';

/** Dibuja la pantalla en `raiz`; puede devolver una función de limpieza. */
type Pintor = (raiz: HTMLElement) => void | (() => void);

const pantallas = new Map<NombrePantalla, Pintor>();
let limpiar: void | (() => void);

export const app = {
  datos: datosIniciales() as Datos,
  /** Momento (ms) de los datos mostrados: de la última descarga o de la copia guardada. */
  fechaDatos: null as number | null,
  /** true si no se pudo descargar y se muestra la copia guardada. */
  sinConexion: false,
  actual: 'calendario' as NombrePantalla,
  raiz: null as HTMLElement | null,

  registrar(nombre: NombrePantalla, pintor: Pintor): void {
    pantallas.set(nombre, pintor);
  },

  ir(nombre: NombrePantalla): void {
    if (!this.raiz) return;
    limpiar?.();
    this.actual = nombre;
    this.raiz.replaceChildren();
    limpiar = pantallas.get(nombre)!(this.raiz);
    window.scrollTo(0, 0);
  },

  /** Vuelve a dibujar la pantalla actual si es el calendario (p. ej. al llegar datos nuevos). */
  refrescarCalendario(): void {
    if (this.actual === 'calendario') {
      const y = window.scrollY;
      this.ir('calendario');
      window.scrollTo(0, y);
    }
  },
};
