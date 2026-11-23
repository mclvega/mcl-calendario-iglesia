import { normalizarDatos, type Datos } from './core/datos';

/*
 * Lo que queda en este navegador: preferencias de lectura y la última copia del calendario
 * (para verlo sin conexión). El calendario de verdad vive en el servidor.
 */

const CLAVE_PREFERENCIAS = 'mcl-calendario-iglesia:preferencias';
const CLAVE_COPIA = 'mcl-calendario-iglesia:copia';

/** Tamaños de letra base en px; el índice se guarda en las preferencias. */
export const TAMANOS_LETRA = [18, 20, 22, 25, 28, 32] as const;

export type Tema = 'claro' | 'oscuro';

export interface Preferencias {
  tamano: number;
  tema: Tema;
}

export function preferenciasPorDefecto(): Preferencias {
  return { tamano: 2, tema: 'claro' };
}

export function normalizarPreferencias(entrada: unknown): Preferencias {
  const d = preferenciasPorDefecto();
  if (typeof entrada !== 'object' || entrada === null) return d;
  const e = entrada as Partial<Preferencias>;
  return {
    tamano: Number.isInteger(e.tamano) && e.tamano! >= 0 && e.tamano! < TAMANOS_LETRA.length ? e.tamano! : d.tamano,
    tema: e.tema === 'oscuro' ? 'oscuro' : 'claro',
  };
}

function leer(clave: string): unknown {
  try {
    const texto = localStorage.getItem(clave);
    return texto ? JSON.parse(texto) : null;
  } catch {
    return null;
  }
}

function escribir(clave: string, valor: unknown): void {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}

export const leerPreferencias = () => normalizarPreferencias(leer(CLAVE_PREFERENCIAS));
export const guardarPreferencias = (p: Preferencias) => escribir(CLAVE_PREFERENCIAS, p);

export function aplicarPreferencias(p: Preferencias): void {
  const raiz = document.documentElement;
  raiz.style.fontSize = `${TAMANOS_LETRA[p.tamano]}px`;
  raiz.dataset.tema = p.tema;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', p.tema === 'oscuro' ? '#000000' : '#f6f1e7');
}

export interface Copia {
  datos: Datos;
  /** Momento de la descarga (ms). */
  fecha: number;
}

export function leerCopia(): Copia | null {
  const c = leer(CLAVE_COPIA) as Partial<Copia> | null;
  const datos = normalizarDatos(c?.datos);
  return datos && typeof c?.fecha === 'number' ? { datos, fecha: c.fecha } : null;
}

export const guardarCopia = (datos: Datos) => escribir(CLAVE_COPIA, { datos, fecha: Date.now() } satisfies Copia);
