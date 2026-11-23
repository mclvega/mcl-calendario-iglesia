import { datosVacios, type Datos } from './datos';

/*
 * Datos iniciales copiados de la pizarra de noviembre/diciembre 2026.
 * Se usan mientras el servidor no tenga un calendario guardado.
 */
const PIZARRA: [fecha: string, coordinacion: string, predicacion: string, nota?: string][] = [
  ['2026-11-10', 'Rosa L.', 'Rosalía D.'],
  ['2026-11-12', 'Manuel L.', 'Israel E.'],
  ['2026-11-15', 'Rosalía D.', 'P. Silvia R.'],
  ['2026-11-17', 'Yesica D.', 'Josefina J.'],
  ['2026-11-19', 'Hayde C.', 'Manuel L.'],
  ['2026-11-22', 'Israel E.', 'P. Eliasib A.'],
  ['2026-11-24', 'Maritza', 'David H.'],
  ['2026-11-26', 'Josefina J.', 'P. Silvia R.'],
  ['2026-11-29', 'Manuel L.', 'P. Eliasib A.'],
  ['2026-12-01', 'Rosalía D.', 'Israel E.'],
  ['2026-12-03', 'Rosa L.', 'Rosalía D.'],
  ['2026-12-06', 'David H.', 'P. Eliasib A.', 'Día de Gracias'],
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
