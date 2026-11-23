# Calendario de la Iglesia

Calendario de los cultos: quién coordina, quién predica (y cualquier otro tipo de tarea) cada día. Pensado para personas mayores: letra grande, alto contraste, el próximo culto destacado arriba y la lista del mes como en la pizarra.

Sitio: https://mcl-calendario-iglesia.netlify.app

## Uso

- **Ver**: abrir el sitio. Al final del calendario: **A− / A+** (tamaño de la letra), 🌙/☀️ (fondo oscuro o claro) y ⚙ (Configuración).
- **👤 Filtrar por**: elegir una persona muestra su próximo turno arriba y solo sus días en el mes, con su nombre resaltado. La elección se recuerda en ese teléfono; la ✕ del filtro lo limpia.
- **📋 Copiar para compartir**: mantener presionada una fecha (o el cuadro del próximo culto) y soltar copia «Martes 24 de noviembre de 2026 / Coordinación: … / Predicación: …» para pegarlo en WhatsApp.
- **📲 Instalar como app**: al final del calendario, con el botón (Android/Chrome) o los pasos para iPhone. No hay botón de descarga: cada vez que se abre con internet se guarda sola la última versión (app y calendario) para verla sin conexión.
- **Configurar**: botón **⚙** → contraseña. Se guarda solo, un segundo después de cada cambio.
  - **Fechas**: por mes, cada día de culto con filas **Tipo ▾ + Persona ▾**, nota opcional, «No hay culto este día» y «Agregar una fecha» especial.
  - 👥 **Personas**: mantenedor de la lista que se elige en cada fecha (renombrar cambia también sus fechas).
  - 🏷️ **Tipos**: Coordinación, Predicación… agregar, renombrar, ordenar y eliminar.
  - ⛪ **Días de culto**: días de la semana que aparecen solos cada mes (por defecto martes, jueves y domingo).
  - 🔒 **Sesión**: cerrar sesión.

## Técnica

- Vite + TypeScript estricto, sin framework (patrón de los proyectos de `proyectos/netlify`).
- Los datos se guardan en **Netlify Blobs** con `netlify/functions/calendario.mts` (patrón de `home/netlify/functions/sitios.mjs`):
  - `GET /api/calendario` público (si no hay nada guardado, devuelve los datos de la pizarra de `src/core/semilla.ts`).
  - `POST /api/login { clave }` → token de 12 h firmado con HMAC.
  - `PUT /api/calendario` con `Authorization: Bearer <token>`.
- La validación (`normalizarDatos` en `src/core/datos.ts`) es la misma en el navegador y en la función.
- La contraseña va en la variable `ADMIN_PASSWORD` (en Netlify y en `.env` local; ver `.env.example`). No está en el código.
- PWA: el service worker guarda la app; el calendario queda copiado en `localStorage` para verlo sin conexión.

## Desarrollo

```bash
npm install
npm test
npm run build
netlify dev --port 4300   # o el launch de VS Code; con .env para la contraseña
```

Íconos: `node ../netlify/herramientas/iconos.mjs calendario public`.
