import { diaSemana, esFechaValida, fechaLarga, fechasPorSemana, prefijoMes, type Mes } from './fechas';

/*
 * Modelo del calendario. Se usa en el navegador y también en la función de Netlify
 * (`netlify/functions/calendario.mts`), así la validación es la misma en ambos lados.
 */

export interface Rol {
  id: string;
  nombre: string;
}

export interface Dia {
  /** Persona por id de rol. */
  asignaciones: Record<string, string>;
  nota?: string;
  /** Día de culto habitual que no se celebra (no se muestra al público). */
  oculto?: boolean;
  /** Día especial fuera de los días de culto habituales. */
  extra?: boolean;
}

export interface Datos {
  roles: Rol[];
  personas: string[];
  /** Días de culto de la semana (0 = domingo … 6 = sábado). */
  diasSemana: number[];
  /** Días con datos, por fecha 'AAAA-MM-DD'. */
  dias: Record<string, Dia>;
}

export const LIMITES = {
  roles: 10,
  personas: 300,
  dias: 3000,
  nombre: 60,
  rol: 40,
  nota: 120,
} as const;

export const ROLES_POR_DEFECTO: Rol[] = [
  { id: 'coordinacion', nombre: 'Coordinación' },
  { id: 'predicacion', nombre: 'Predicación' },
];

/** Martes, jueves y domingo. */
export const DIAS_SEMANA_POR_DEFECTO = [2, 4, 0];

export function datosVacios(): Datos {
  return {
    roles: ROLES_POR_DEFECTO.map((r) => ({ ...r })),
    personas: [],
    diasSemana: [...DIAS_SEMANA_POR_DEFECTO],
    dias: {},
  };
}

const texto = (valor: unknown, max: number) =>
  typeof valor === 'string' ? valor.replace(/\s+/g, ' ').trim().slice(0, max) : '';

const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Identificador de rol a partir de su nombre («Predicación» → «predicacion»), único en la lista. */
export function idDeRol(nombre: string, existentes: readonly string[]): string {
  const base =
    nombre
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'rol';
  let id = base;
  for (let n = 2; existentes.includes(id); n++) id = `${base}-${n}`;
  return id;
}

/**
 * Limpia datos de origen desconocido (red, almacenamiento o el cuerpo de un PUT).
 * Devuelve null si no tienen la forma mínima (objeto con lista de roles).
 */
export function normalizarDatos(entrada: unknown): Datos | null {
  if (!esObjeto(entrada) || !Array.isArray(entrada.roles)) return null;

  const roles: Rol[] = [];
  for (const r of entrada.roles.slice(0, LIMITES.roles)) {
    if (!esObjeto(r)) continue;
    const nombre = texto(r.nombre, LIMITES.rol);
    const id = texto(r.id, 30);
    if (!nombre || !/^[a-z0-9-]+$/.test(id) || roles.some((x) => x.id === id)) continue;
    roles.push({ id, nombre });
  }
  if (!roles.length) return null;

  const personas: string[] = [];
  if (Array.isArray(entrada.personas)) {
    for (const p of entrada.personas) {
      const nombre = texto(p, LIMITES.nombre);
      if (nombre && !personas.includes(nombre) && personas.length < LIMITES.personas) personas.push(nombre);
    }
  }

  const diasSemana = Array.isArray(entrada.diasSemana)
    ? [...new Set(entrada.diasSemana.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))]
    : [...DIAS_SEMANA_POR_DEFECTO];

  const dias: Record<string, Dia> = {};
  if (esObjeto(entrada.dias)) {
    const ids = new Set(roles.map((r) => r.id));
    for (const fecha of Object.keys(entrada.dias).sort().slice(-LIMITES.dias)) {
      const d = entrada.dias[fecha];
      if (!esFechaValida(fecha) || !esObjeto(d)) continue;
      const dia: Dia = { asignaciones: {} };
      if (esObjeto(d.asignaciones)) {
        for (const [rol, persona] of Object.entries(d.asignaciones)) {
          const nombre = texto(persona, LIMITES.nombre);
          if (ids.has(rol) && nombre) dia.asignaciones[rol] = nombre;
        }
      }
      const nota = texto(d.nota, LIMITES.nota);
      if (nota) dia.nota = nota;
      if (d.oculto === true) dia.oculto = true;
      if (d.extra === true) dia.extra = true;
      if (!diaVacio(dia)) dias[fecha] = dia;
    }
  }

  return { roles, personas, diasSemana, dias };
}

export const diaVacio = (d: Dia) => !Object.keys(d.asignaciones).length && !d.nota && !d.oculto && !d.extra;

/**
 * Fechas de culto del mes, ordenadas: los días habituales de la semana más los días especiales
 * y cualquier día con datos. Los ocultos solo se incluyen si se pide (para la Configuración).
 */
export function fechasDelMes(datos: Datos, mes: Mes, incluirOcultos = false): string[] {
  const prefijo = prefijoMes(mes);
  const fechas = new Set(fechasPorSemana(mes, datos.diasSemana));
  for (const fecha of Object.keys(datos.dias)) if (fecha.startsWith(prefijo)) fechas.add(fecha);
  return [...fechas].filter((f) => incluirOcultos || !datos.dias[f]?.oculto).sort();
}

/** ¿Se celebra culto ese día? */
export function hayCulto(datos: Datos, fecha: string): boolean {
  const dia = datos.dias[fecha];
  if (dia?.oculto) return false;
  if (dia && (dia.extra || Object.keys(dia.asignaciones).length || dia.nota)) return true;
  return datos.diasSemana.includes(diaSemana(fecha));
}

/** ¿El día tiene al menos una persona asignada (y se celebra)? Solo esos se muestran al público. */
export function tieneAsignaciones(datos: Datos, fecha: string): boolean {
  const dia = datos.dias[fecha];
  return !!dia && !dia.oculto && Object.values(dia.asignaciones).some(Boolean);
}

/** Primer día con asignaciones desde `desde` (incluido). */
export function proximoCulto(datos: Datos, desde: string): string | null {
  return Object.keys(datos.dias).sort().find((f) => f >= desde && tieneAsignaciones(datos, f)) ?? null;
}

/** Personas para el filtro: la lista más cualquier nombre escrito en una asignación, en orden alfabético. */
export function personasDelCalendario(datos: Datos): string[] {
  const nombres = new Set(datos.personas);
  for (const dia of Object.values(datos.dias)) for (const p of Object.values(dia.asignaciones)) if (p) nombres.add(p);
  return [...nombres].sort((a, b) => a.localeCompare(b, 'es'));
}

/** ¿Esa persona tiene alguna tarea ese día (y el día se celebra)? */
export function tieneTurno(datos: Datos, fecha: string, persona: string): boolean {
  const dia = datos.dias[fecha];
  return !!dia && !dia.oculto && Object.values(dia.asignaciones).includes(persona);
}

/** Primera fecha desde `desde` (incluida) en que la persona tiene turno. */
export function proximoTurno(datos: Datos, persona: string, desde: string): string | null {
  return Object.keys(datos.dias).sort().find((f) => f >= desde && tieneTurno(datos, f, persona)) ?? null;
}

/** Cambia el nombre de una persona en la lista y en todas sus asignaciones. */
export function renombrarPersona(datos: Datos, anterior: string, nuevo: string): void {
  datos.personas = datos.personas.map((p) => (p === anterior ? nuevo : p));
  for (const dia of Object.values(datos.dias)) {
    for (const [rol, persona] of Object.entries(dia.asignaciones)) if (persona === anterior) dia.asignaciones[rol] = nuevo;
  }
}

/** Quita un rol y sus asignaciones. */
export function quitarRol(datos: Datos, id: string): void {
  datos.roles = datos.roles.filter((r) => r.id !== id);
  for (const [fecha, dia] of Object.entries(datos.dias)) {
    delete dia.asignaciones[id];
    if (diaVacio(dia)) delete datos.dias[fecha];
  }
}

/** Texto de un día para copiar y compartir (p. ej. por WhatsApp): fecha, nota y cada tipo con su persona. */
export function textoDelDia(datos: Datos, fecha: string): string {
  const dia = datos.dias[fecha];
  const lineas = [fechaLarga(fecha, true)];
  if (dia?.nota) lineas.push(`⭐ ${dia.nota}`);
  for (const r of datos.roles) {
    const persona = dia?.asignaciones[r.id];
    if (persona) lineas.push(`${r.nombre}: ${persona}`);
  }
  return lineas.join('\n');
}
