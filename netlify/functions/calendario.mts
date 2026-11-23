import { createHmac, timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { normalizarDatos } from '../../src/core/datos';
import { datosIniciales } from '../../src/core/semilla';

// Calendario de la iglesia guardado en Netlify Blobs (mismo patrón que home/netlify/functions/sitios.mjs).
// GET /api/calendario: público.
// POST /api/login { clave }: valida la contraseña de Configuración (ADMIN_PASSWORD) y entrega un token.
// PUT /api/calendario: requiere "Authorization: Bearer <token>".
const CLAVE_BLOB = 'datos';
const DURACION_TOKEN = 12 * 60 * 60 * 1000;

const json = (datos: unknown, status = 200) =>
  new Response(JSON.stringify(datos), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const firmar = (secreto: string, datos: string) => createHmac('sha256', secreto).update(datos).digest('base64url');

function iguales(a: string, b: string): boolean {
  // Se comparan las firmas HMAC para que el tiempo no dependa del largo ni del contenido.
  const x = Buffer.from(firmar('comparar', a));
  const y = Buffer.from(firmar('comparar', b));
  return timingSafeEqual(x, y);
}

function crearToken(secreto: string): string {
  const expira = String(Date.now() + DURACION_TOKEN);
  return `${expira}.${firmar(secreto, expira)}`;
}

function tokenValido(secreto: string, cabecera: string | null): boolean {
  const token = cabecera?.replace(/^Bearer\s+/i, '') ?? '';
  const [expira, firma] = token.split('.');
  if (!expira || !firma || Number(expira) < Date.now()) return false;
  return iguales(firma, firmar(secreto, expira));
}

export default async (req: Request) => {
  // Lectura fuerte: sin ella, un GET justo después de guardar puede devolver el calendario anterior
  const store = getStore({ name: 'calendario', consistency: 'strong' });
  const secreto = Netlify.env.get('ADMIN_PASSWORD');
  const ruta = new URL(req.url).pathname;

  if (ruta === '/api/login') {
    if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
    if (!secreto) return json({ error: 'Falta ADMIN_PASSWORD en el servidor' }, 500);
    const { clave } = (await req.json().catch(() => ({}))) as { clave?: unknown };
    if (!iguales(String(clave ?? ''), secreto)) return json({ error: 'Contraseña incorrecta' }, 401);
    return json({ token: crearToken(secreto) });
  }

  if (req.method === 'GET') {
    const guardado = normalizarDatos(await store.get(CLAVE_BLOB, { type: 'json' }));
    return json(guardado ?? datosIniciales());
  }

  if (req.method === 'PUT') {
    if (!secreto || !tokenValido(secreto, req.headers.get('authorization'))) {
      return json({ error: 'Sesión vencida' }, 401);
    }
    let cuerpo: unknown;
    try {
      cuerpo = await req.json();
    } catch {
      return json({ error: 'JSON inválido' }, 400);
    }
    const datos = normalizarDatos(cuerpo);
    if (!datos) return json({ error: 'Datos inválidos: se necesita al menos un tipo' }, 400);

    await store.setJSON(CLAVE_BLOB, datos);
    return json(datos);
  }

  return json({ error: 'Método no permitido' }, 405);
};

export const config = { path: ['/api/calendario', '/api/login'] };
