import { app } from '../app';
import { entrar, ErrorApi, leerToken } from '../api';
import { fechasDelMes, proximoCulto, type Datos, type Dia } from '../core/datos';
import { DIAS_CORTOS, deISO, fechaLarga, hoyISO, mesDe, moverMes, nombreMes, sumarDias, type Mes } from '../core/fechas';
import { aplicarPreferencias, guardarPreferencias, leerPreferencias, TAMANOS_LETRA } from '../storage';
import { VERSION } from '../version';
import { abrirModal, boton, h } from './dom';

/*
 * Vista pública, pensada para personas mayores: letra grande, alto contraste,
 * el próximo culto destacado arriba y la lista del mes como en la pizarra.
 */

let mesVisible: Mes | null = null;

export function pantallaCalendario(raiz: HTMLElement): void {
  const hoy = hoyISO();
  const mesHoy = mesDe(hoy);
  mesVisible ??= mesHoy;
  const datos = app.datos;

  const proximo = destacado(datos, hoy);
  raiz.append(cabecera(), ...(proximo ? [proximo] : []), navegacionMes(mesVisible, mesHoy), listaDelMes(datos, mesVisible, hoy), pie());
}

function cabecera(): HTMLElement {
  const prefs = leerPreferencias();
  const cambiar = (cambios: Partial<typeof prefs>) => {
    const nuevas = { ...prefs, ...cambios };
    guardarPreferencias(nuevas);
    aplicarPreferencias(nuevas);
    app.refrescarCalendario();
  };
  return h(
    'header',
    { class: 'cabecera' },
    h('h1', { class: 'titulo' }, h('span', { 'aria-hidden': 'true', text: '📅 ' }), 'Calendario'),
    h(
      'div',
      { class: 'herramientas' },
      h('button', {
        type: 'button',
        class: 'btn-herramienta',
        text: 'A−',
        'aria-label': 'Letra más pequeña',
        disabled: prefs.tamano === 0,
        onclick: () => cambiar({ tamano: prefs.tamano - 1 }),
      }),
      h('button', {
        type: 'button',
        class: 'btn-herramienta',
        text: 'A+',
        'aria-label': 'Letra más grande',
        disabled: prefs.tamano === TAMANOS_LETRA.length - 1,
        onclick: () => cambiar({ tamano: prefs.tamano + 1 }),
      }),
      h('button', {
        type: 'button',
        class: 'btn-herramienta',
        text: prefs.tema === 'oscuro' ? '☀️' : '🌙',
        'aria-label': prefs.tema === 'oscuro' ? 'Usar fondo claro' : 'Usar fondo oscuro',
        onclick: () => cambiar({ tema: prefs.tema === 'oscuro' ? 'claro' : 'oscuro' }),
      }),
      h('button', {
        type: 'button',
        class: 'btn-herramienta',
        text: '⚙',
        'aria-label': 'Configuración',
        onclick: abrirConfiguracion,
      }),
    ),
  );
}

/** Filas «Tipo: Persona» de un día, en el orden de los tipos. */
function asignaciones(datos: Datos, dia: Dia | undefined, clase: string): HTMLElement {
  const filas = datos.roles
    .filter((r) => dia?.asignaciones[r.id])
    .map((r) =>
      h('div', { class: 'asignacion' }, h('span', { class: 'rol', text: r.nombre }), h('span', { class: 'persona', text: dia!.asignaciones[r.id] })),
    );
  return h('div', { class: clase }, ...(filas.length ? filas : [h('p', { class: 'por-confirmar', text: 'Por confirmar' })]));
}

function destacado(datos: Datos, hoy: string): HTMLElement | null {
  const fecha = proximoCulto(datos, hoy);
  if (!fecha) return null;
  const dia = datos.dias[fecha];
  const etiqueta = fecha === hoy ? 'HOY' : fecha === sumarDias(hoy, 1) ? 'MAÑANA' : 'PRÓXIMO CULTO';
  return h(
    'section',
    { class: `destacado${fecha === hoy ? ' es-hoy' : ''}`, 'aria-label': 'Próximo culto' },
    h('p', { class: 'destacado-etiqueta', text: etiqueta }),
    h('h2', { class: 'destacado-fecha', text: fechaLarga(fecha) }),
    dia?.nota ? h('p', { class: 'nota', text: `⭐ ${dia.nota}` }) : null,
    asignaciones(datos, dia, 'destacado-asignaciones'),
  );
}

function navegacionMes(mes: Mes, mesHoy: Mes): HTMLElement {
  const ir = (nuevo: Mes) => {
    mesVisible = nuevo;
    app.refrescarCalendario();
    document.querySelector('.mes-titulo')?.scrollIntoView({ block: 'start' });
  };
  const esMesActual = mes.anio === mesHoy.anio && mes.mes === mesHoy.mes;
  return h(
    'nav',
    { class: 'nav-mes', 'aria-label': 'Cambiar de mes' },
    h(
      'div',
      { class: 'nav-mes-fila' },
      boton('Anterior', () => ir(moverMes(mes, -1)), { icono: '◀', clase: 'btn-mes', etiqueta: 'Mes anterior' }),
      h('h2', { class: 'mes-titulo', text: nombreMes(mes) }),
      boton('Siguiente', () => ir(moverMes(mes, 1)), { icono: '▶', clase: 'btn-mes btn-icono-derecha', etiqueta: 'Mes siguiente' }),
    ),
    esMesActual ? null : boton('Volver al mes de hoy', () => ir(mesHoy), { variante: 'suave', clase: 'btn-volver' }),
  );
}

function listaDelMes(datos: Datos, mes: Mes, hoy: string): HTMLElement {
  const fechas = fechasDelMes(datos, mes);
  if (!fechas.length) return h('p', { class: 'vacio', text: 'No hay cultos anotados este mes.' });
  return h(
    'ol',
    { class: 'lista-dias' },
    ...fechas.map((fecha) => {
      const d = deISO(fecha)!;
      const dia = datos.dias[fecha];
      const clase = fecha === hoy ? 'es-hoy' : fecha < hoy ? 'pasado' : '';
      return h(
        'li',
        { class: `dia ${clase}`, 'aria-label': fechaLarga(fecha) },
        h(
          'div',
          { class: 'dia-fecha', 'aria-hidden': 'true' },
          h('span', { class: 'dia-nombre', text: DIAS_CORTOS[d.getDay()] }),
          h('span', { class: 'dia-numero', text: d.getDate() }),
          fecha === hoy ? h('span', { class: 'dia-hoy', text: 'HOY' }) : null,
        ),
        h(
          'div',
          { class: 'dia-cuerpo' },
          dia?.nota ? h('p', { class: 'nota', text: `⭐ ${dia.nota}` }) : null,
          asignaciones(datos, dia, 'dia-asignaciones'),
        ),
      );
    }),
  );
}

function pie(): HTMLElement {
  let estado = '';
  if (app.fechaDatos) {
    const f = new Date(app.fechaDatos);
    const hora = f.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    const dia = f.toLocaleDateString('es', { day: 'numeric', month: 'long' });
    estado = app.sinConexion ? `📴 Sin conexión · calendario guardado el ${dia} a las ${hora}` : `✅ Actualizado a las ${hora}`;
  } else if (app.sinConexion) {
    estado = '📴 Sin conexión · se muestra el calendario inicial';
  }
  return h(
    'footer',
    { class: 'pie' },
    estado ? h('p', { class: `estado-conexion${app.sinConexion ? ' sin-conexion' : ''}`, text: estado }) : null,
    h('p', { class: 'version', text: `Calendario de la Iglesia · v${VERSION}` }),
  );
}

/* ---------- Entrada a Configuración ---------- */

function abrirConfiguracion(): void {
  if (leerToken()) {
    app.ir('configuracion');
    return;
  }
  pedirContrasena(() => app.ir('configuracion'));
}

/** Pide la contraseña de Configuración y llama a `alEntrar` si es correcta. */
export function pedirContrasena(alEntrar: () => void, titulo = '⚙ Configuración'): void {
  const campo = h('input', {
    type: 'password',
    class: 'campo campo-clave',
    autocomplete: 'current-password',
    'aria-label': 'Contraseña',
    placeholder: 'Contraseña',
    required: true,
    'data-foco-inicial': true,
  }) as HTMLInputElement;
  const error = h('p', { class: 'error', role: 'alert' });
  const enviar = boton('Entrar', () => undefined, { variante: 'primario', clase: 'btn-ancho' });
  enviar.type = 'submit';

  const formulario = h(
    'form',
    { class: 'pila', autocomplete: 'off' },
    h('p', { class: 'texto-grande', text: 'Escribe la contraseña para cambiar el calendario.' }),
    campo,
    error,
    enviar,
  );
  const modal = abrirModal({ titulo, contenido: formulario });
  formulario.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!campo.value) return;
    enviar.disabled = true;
    error.textContent = '';
    try {
      await entrar(campo.value);
      modal.cerrar();
      alEntrar();
    } catch (e) {
      error.textContent =
        e instanceof ErrorApi && e.status === 401
          ? 'Contraseña incorrecta.'
          : e instanceof ErrorApi && e.status === 0
            ? 'Necesitas conexión a internet para entrar.'
            : `No se pudo entrar: ${(e as Error).message}`;
      campo.select();
    } finally {
      enviar.disabled = false;
    }
  });
}
