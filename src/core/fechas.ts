/** Fechas en formato 'AAAA-MM-DD' (hora local) y nombres en español. */

export const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const;
export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const;

const RE_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

const dos = (n: number) => String(n).padStart(2, '0');

/** Fecha local → 'AAAA-MM-DD'. */
export function aISO(d: Date): string {
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

/** 'AAAA-MM-DD' → Date a mediodía local (evita saltos por cambio de hora). Null si no es válida. */
export function deISO(fecha: string): Date | null {
  const m = RE_FECHA.exec(fecha);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return aISO(d) === fecha ? d : null;
}

export const esFechaValida = (fecha: string) => deISO(fecha) !== null;

export const hoyISO = () => aISO(new Date());

export function diaSemana(fecha: string): number {
  return deISO(fecha)?.getDay() ?? -1;
}

/** «Martes 24 de noviembre» (con el año solo si se pide). */
export function fechaLarga(fecha: string, conAnio = false): string {
  const d = deISO(fecha);
  if (!d) return fecha;
  const texto = `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()].toLowerCase()}`;
  return conAnio ? `${texto} de ${d.getFullYear()}` : texto;
}

/** Suma días a una fecha 'AAAA-MM-DD'. */
export function sumarDias(fecha: string, dias: number): string {
  const d = deISO(fecha)!;
  d.setDate(d.getDate() + dias);
  return aISO(d);
}

export interface Mes {
  anio: number;
  /** 0 = enero */
  mes: number;
}

export function mesDe(fecha: string): Mes {
  const d = deISO(fecha)!;
  return { anio: d.getFullYear(), mes: d.getMonth() };
}

export function moverMes({ anio, mes }: Mes, delta: number): Mes {
  const total = anio * 12 + mes + delta;
  return { anio: Math.floor(total / 12), mes: ((total % 12) + 12) % 12 };
}

export const nombreMes = ({ anio, mes }: Mes) => `${MESES[mes]} ${anio}`;

export const prefijoMes = ({ anio, mes }: Mes) => `${anio}-${dos(mes + 1)}-`;

/** Todas las fechas del mes que caen en los días de la semana indicados. */
export function fechasPorSemana({ anio, mes }: Mes, diasSemana: readonly number[]): string[] {
  const fechas: string[] = [];
  const ultimo = new Date(anio, mes + 1, 0).getDate();
  for (let dia = 1; dia <= ultimo; dia++) {
    const d = new Date(anio, mes, dia, 12);
    if (diasSemana.includes(d.getDay())) fechas.push(aISO(d));
  }
  return fechas;
}
