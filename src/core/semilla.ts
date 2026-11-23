import { datosVacios, type Datos } from './datos';

/*
 * Datos iniciales copiados de la pizarra de noviembre/diciembre 2026.
 * Se usan mientras el servidor no tenga un calendario guardado.
 */
const PIZARRA: [fecha: string, coordinacion: string, predicacion: string, nota?: string][] = [
  ['2026-11-10', 'H. Rosa L.', 'H. Rosalía D.'],
  ['2026-11-12', 'H. Manuel L.', 'H. Israel E.'],
  ['2026-11-15', 'H. Rosalía D.', 'P. Silvia R.'],
  ['2026-11-17', 'H. Yesica D.', 'H. Josefina J.'],
  ['2026-11-19', 'H. Hayde C.', 'H. Manuel L.'],
  ['2026-11-22', 'H. Israel E.', 'P. Eliasib A.'],
  ['2026-11-24', 'H. Maritza', 'H. David H.'],
  ['2026-11-26', 'H. Josefina J.', 'P. Silvia R.'],
  ['2026-11-29', 'H. Manuel L.', 'P. Eliasib A.'],
  ['2026-12-01', 'H. Rosalía D.', 'H. Israel E.'],
  ['2026-12-03', 'H. Rosa L.', 'H. Rosalía D.'],
  ['2026-12-06', 'H. David H.', 'P. Eliasib A.', 'Día de Gracias'],
];

export function datosIniciales(): Datos {
  const datos = datosVacios();
  for (const [fecha, coordinacion, predicacion, nota] of PIZARRA) {
    datos.dias[fecha] = { asignaciones: { coordinacion, predicacion }, ...(nota ? { nota } : {}) };
    for (const p of [coordinacion, predicacion]) if (!datos.personas.includes(p)) datos.personas.push(p);
  }
  datos.personas.sort((a, b) => a.localeCompare(b, 'es'));
  return datos;
}
