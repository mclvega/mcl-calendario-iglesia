import { normalizarDatos, type Datos } from './core/datos';
import { guardarCopia } from './storage';

/*
 * Comunicación con la función de Netlify (`netlify/functions/calendario.mts`).
 * GET /api/calendario es público; PUT necesita el token que entrega POST /api/login.
 */

const CLAVE_TOKEN = 'mcl-calendario-iglesia:token';

export class ErrorApi extends Error {
  constructor(
    mensaje: string,
    readonly status: number,
  ) {
    super(mensaje);
  }
}

async function pedir(ruta: string, opciones: RequestInit = {}): Promise<unknown> {
  let respuesta: Response;
  try {
    respuesta = await fetch(ruta, { cache: 'no-store', ...opciones });
  } catch {
    throw new ErrorApi('Sin conexión', 0);
  }
  const cuerpo = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    const mensaje = (cuerpo as { error?: string } | null)?.error ?? `Error ${respuesta.status}`;
    throw new ErrorApi(mensaje, respuesta.status);
  }
  return cuerpo;
}

/** Descarga el calendario y guarda una copia para verlo sin conexión. */
export async function descargarCalendario(): Promise<Datos> {
  const datos = normalizarDatos(await pedir('/api/calendario'));
  if (!datos) throw new ErrorApi('El servidor devolvió datos no válidos', 500);
  guardarCopia(datos);
  return datos;
}

export async function guardarCalendario(datos: Datos): Promise<Datos> {
  const guardados = normalizarDatos(
    await pedir('/api/calendario', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${leerToken() ?? ''}` },
      body: JSON.stringify(datos),
    }),
  );
  if (!guardados) throw new ErrorApi('El servidor devolvió datos no válidos', 500);
  guardarCopia(guardados);
  return guardados;
}

/** Entra con la contraseña de Configuración; deja el token en la sesión del navegador. */
export async function entrar(clave: string): Promise<void> {
  const { token } = (await pedir('/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clave }),
  })) as { token: string };
  try {
    sessionStorage.setItem(CLAVE_TOKEN, token);
  } catch {
    /* sin almacenamiento de sesión */
  }
  tokenEnMemoria = token;
}

let tokenEnMemoria: string | null = null;

/** Token vigente (formato «expira.firma»), o null si no hay o ya venció. */
export function leerToken(): string | null {
  let token = tokenEnMemoria;
  try {
    token ??= sessionStorage.getItem(CLAVE_TOKEN);
  } catch {
    /* sin almacenamiento de sesión */
  }
  const expira = Number(token?.split('.')[0]);
  return token && expira > Date.now() ? token : null;
}

export function salir(): void {
  tokenEnMemoria = null;
  try {
    sessionStorage.removeItem(CLAVE_TOKEN);
  } catch {
    /* sin almacenamiento de sesión */
  }
}
