import { app } from '../app';
import { entrar, ErrorApi, leerToken } from '../api';
import { fechasDelMes, personasDelCalendario, proximoCulto, proximoTurno, tieneAsignaciones, tieneTurno, type Datos, type Dia } from '../core/datos';
import { DIAS, deISO, fechaLarga, hoyISO, mesDe, moverMes, nombreMes, sumarDias, type Mes } from '../core/fechas';
import { aplicarPreferencias, guardarPreferencias, leerPreferencias, TAMANOS_LETRA } from '../storage';
import { VERSION } from '../version';
import { abrirModal, boton, h } from './dom';
import { opcionesSinConexion } from './sinconexion';

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
  const personas = personasDelCalendario(datos);
  // Si la persona guardada no está en estos datos (p. ej. aún no llegan los del servidor), se muestran todos.
  const guardada = leerPreferencias().persona;
  const persona = personas.includes(guardada) ? guardada : '';

  const proximo = persona ? destacadoPersona(datos, persona, hoy) : destacado(datos, hoy);
  raiz.append(
    cabecera(personas, persona),
    ...(proximo ? [proximo] : []),
    navegacionMes(datos, mesVisible, mesHoy, persona),
    listaDelMes(datos, mesVisible, hoy, persona),
    pie(),
  );
}

function cambiarPersona(persona: string): void {
  guardarPreferencias({ ...leerPreferencias(), persona });
  app.refrescarCalendario();
}

function filtroPersona(personas: string[], persona: string): HTMLElement {
  const lista = h('select', { class: `campo${persona ? ' activo' : ''}`, id: 'filtro-persona' }) as HTMLSelectElement;
  lista.append(h('option', { value: '', text: 'Todos' }));
  for (const p of personas) lista.append(h('option', { value: p, text: p }));
  lista.value = persona;
  lista.addEventListener('change', () => cambiarPersona(lista.value));
  const limpiar = persona
    ? h('button', { type: 'button', class: 'limpiar-filtro', text: '✕', 'aria-label': 'Limpiar filtro', onclick: () => cambiarPersona('') })
    : null;
  return h(
    'div',
    { class: 'filtro-persona' },
    h('label', { class: 'etiqueta', for: 'filtro-persona', text: '👤 Filtrar por:' }),
    h('div', { class: 'filtro-campo' }, lista, limpiar),
  );
}

/** Próximo turno de la persona elegida en el filtro: todos los tipos de ese día, con su nombre resaltado. */
function destacadoPersona(datos: Datos, persona: string, hoy: string): HTMLElement {
  const fecha = proximoTurno(datos, persona, hoy);
  if (!fecha) {
    return h(
      'section',
      { class: 'destacado', 'aria-label': 'Próximo turno' },
      h('p', { class: 'destacado-persona', text: persona }),
      h('p', { class: 'texto-grande', text: 'No tiene turnos anotados próximamente.' }),
    );
  }
  const dia = datos.dias[fecha];
  const etiqueta = fecha === hoy ? 'HOY LE TOCA' : fecha === sumarDias(hoy, 1) ? 'MAÑANA LE TOCA' : 'PRÓXIMO TURNO';
  return h(
    'section',
    { class: `destacado${fecha === hoy ? ' es-hoy' : ''}`, 'aria-label': 'Próximo turno' },
    h('p', { class: 'destacado-etiqueta', text: etiqueta }),
    h('h2', { class: 'destacado-fecha', text: fechaLarga(fecha) }),
    dia.nota ? h('p', { class: 'nota', text: `⭐ ${dia.nota}` }) : null,
    asignaciones(datos, dia, 'destacado-asignaciones', persona),
  );
}

/** Título y el filtro por persona a todo el ancho. */
function cabecera(personas: string[], persona: string): HTMLElement {
  return h(
    'header',
    { class: 'cabecera' },
    h('h1', { class: 'titulo', text: 'La Segunda Venida de Cristo' }),
    personas.length ? h('div', { class: 'barra-acciones' }, filtroPersona(personas, persona)) : null,
  );
}

/** Botones de letra, tema y Configuración, al final del calendario. */
function herramientas(): HTMLElement {
  const prefs = leerPreferencias();
  const cambiar = (cambios: Partial<typeof prefs>) => {
    const nuevas = { ...prefs, ...cambios };
    guardarPreferencias(nuevas);
    aplicarPreferencias(nuevas);
    app.refrescarCalendario();
  };
  return h(
    'div',
    { class: 'herramientas herramientas-pie' },
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
  );
}

/** Filas «Tipo: Persona» de un día, en el orden de los tipos. */
function asignaciones(datos: Datos, dia: Dia | undefined, clase: string, resaltar = ''): HTMLElement {
  const filas = datos.roles
    .filter((r) => dia?.asignaciones[r.id])
    .map((r) => {
      const nombre = dia!.asignaciones[r.id];
      return h(
        'div',
        { class: 'asignacion' },
        h('span', { class: 'rol', text: r.nombre }),
        h('span', { class: `persona${resaltar && nombre === resaltar ? ' mia' : ''}`, text: nombre }),
      );
    });
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

function navegacionMes(datos: Datos, mes: Mes, mesHoy: Mes, persona: string): HTMLElement {
  // Al cambiar de mes, los botones ◀ ▶ se quedan en el mismo lugar de la pantalla (no salta la vista).
  const ir = (nuevo: Mes) => {
    const raiz = app.raiz!;
    const antes = document.querySelector('.nav-mes')?.getBoundingClientRect().top ?? 0;
    raiz.style.paddingBottom = '';
    mesVisible = nuevo;
    app.refrescarCalendario();
    const nav = document.querySelector('.nav-mes');
    if (!nav) return;
    const objetivo = window.scrollY + nav.getBoundingClientRect().top - antes;
    // Si el mes nuevo es más corto, se agrega espacio abajo para no tener que subir la página.
    const maximo = document.documentElement.scrollHeight - window.innerHeight;
    if (objetivo > maximo) raiz.style.paddingBottom = `${objetivo - maximo + 40}px`;
    window.scrollTo(0, objetivo);
  };
  const esMesActual = mes.anio === mesHoy.anio && mes.mes === mesHoy.mes;
  const turnos = persona ? fechasDelMes(datos, mes).filter((f) => tieneTurno(datos, f, persona)).length : 0;
  return h(
    'nav',
    { class: 'nav-mes', 'aria-label': 'Cambiar de mes' },
    h(
      'div',
      { class: 'nav-mes-fila' },
      boton('Anterior', () => ir(moverMes(mes, -1)), { icono: '◀', clase: 'btn-mes', etiqueta: 'Mes anterior' }),
      h(
        'h2',
        { class: 'mes-titulo' },
        nombreMes(mes),
        persona ? h('span', { class: 'mes-conteo', text: turnos === 1 ? '1 turno' : `${turnos} turnos` }) : null,
      ),
      boton('Siguiente', () => ir(moverMes(mes, 1)), { icono: '▶', clase: 'btn-mes btn-icono-derecha', etiqueta: 'Mes siguiente' }),
    ),
    esMesActual ? null : boton('Volver al mes de hoy', () => ir(mesHoy), { variante: 'suave', clase: 'btn-volver' }),
  );
}

function listaDelMes(datos: Datos, mes: Mes, hoy: string, persona: string): HTMLElement {
  const fechas = fechasDelMes(datos, mes).filter((f) => (persona ? tieneTurno(datos, f, persona) : tieneAsignaciones(datos, f)));
  if (!fechas.length) {
    const texto = persona ? `${persona} no tiene turnos en ${nombreMes(mes).toLowerCase()}.` : 'No hay cultos anotados este mes.';
    return h('p', { class: 'vacio', text: texto });
  }
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
          h('span', { class: 'dia-nombre', text: DIAS[d.getDay()] }),
          h('span', { class: 'dia-numero', text: d.getDate() }),
          fecha === hoy ? h('span', { class: 'dia-hoy', text: 'HOY' }) : null,
        ),
        h(
          'div',
          { class: 'dia-cuerpo' },
          dia?.nota ? h('p', { class: 'nota', text: `⭐ ${dia.nota}` }) : null,
          asignaciones(datos, dia, 'dia-asignaciones', persona),
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
    herramientas(),
    h('div', { class: 'instalar-app' }, opcionesSinConexion()),
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
