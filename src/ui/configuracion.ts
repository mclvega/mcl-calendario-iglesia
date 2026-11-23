import { app } from '../app';
import { ErrorApi, guardarCalendario, salir } from '../api';
import { diaVacio, fechasDelMes, idDeRol, LIMITES, quitarRol, renombrarPersona, type Datos, type Dia } from '../core/datos';
import { DIAS, diaSemana, fechaLarga, hoyISO, mesDe, moverMes, nombreMes, prefijoMes, type Mes } from '../core/fechas';
import { avisar, boton, confirmar, h } from './dom';
import { pedirContrasena } from './calendario';
import { opcionesSinConexion } from './sinconexion';

/*
 * Configuración (protegida con contraseña): mantenedores de fechas, personas, tipos y días de culto.
 * Como en home/admin.html, cada cambio se guarda solo un segundo después.
 */

type Seccion = 'fechas' | 'personas' | 'tipos' | 'dias' | 'datos';

const SECCIONES: [Seccion, string, string][] = [
  ['fechas', '📅', 'Fechas'],
  ['personas', '👥', 'Personas'],
  ['tipos', '🏷️', 'Tipos'],
  ['dias', '🗓️', 'Días de culto'],
  ['datos', '💾', 'Datos'],
];

/** Lunes primero, como en un calendario de pared. */
const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0];

let seccion: Seccion = 'fechas';
let mesEditado: Mes | null = null;

const ordenar = (lista: string[]) => [...lista].sort((a, b) => a.localeCompare(b, 'es'));

export function pantallaConfiguracion(raiz: HTMLElement): () => void {
  const datos: Datos = structuredClone(app.datos);
  mesEditado ??= mesDe(hoyISO());

  /* ---------- Guardado automático ---------- */

  const indicador = h('span', { class: 'estado-guardado', role: 'status', 'aria-live': 'polite' });
  let temporizador = 0;
  let pendiente = false;
  let guardando: Promise<boolean> | null = null;

  const estado = (simbolo: string, texto: string, clase = '') => {
    indicador.className = `estado-guardado ${clase}`;
    indicador.textContent = `${simbolo} ${texto}`;
  };
  estado('✓', 'Guardado', 'ok');

  const cambio = () => {
    pendiente = true;
    estado('●', 'Sin guardar', 'pendiente');
    clearTimeout(temporizador);
    temporizador = window.setTimeout(() => void guardar(), 1000);
  };

  /** Guarda si hay cambios. Devuelve true si todo quedó guardado. */
  const guardar = async (): Promise<boolean> => {
    clearTimeout(temporizador);
    if (guardando) await guardando;
    if (!pendiente) return true;
    pendiente = false;
    estado('…', 'Guardando', 'pendiente');
    guardando = guardarCalendario(datos)
      .then((guardados) => {
        app.datos = guardados;
        app.fechaDatos = Date.now();
        app.sinConexion = false;
        if (!pendiente) estado('✓', 'Guardado', 'ok');
        return true;
      })
      .catch((e: unknown) => {
        pendiente = true;
        if (e instanceof ErrorApi && e.status === 401) {
          salir();
          estado('⚠', 'Sesión vencida', 'error');
          pedirContrasena(() => void guardar(), '🔒 Vuelve a entrar para guardar');
        } else {
          estado('⚠', e instanceof ErrorApi && e.status === 0 ? 'Sin conexión: no se guardó' : 'No se pudo guardar', 'error');
          temporizador = window.setTimeout(() => void guardar(), 10000);
        }
        return false;
      })
      .finally(() => (guardando = null));
    return guardando;
  };

  const terminar = async () => {
    if (!(await guardar())) {
      const ok = await confirmar('Hay cambios sin guardar', 'Si sales ahora, se perderán los últimos cambios.', 'Salir igual', 'Seguir aquí');
      if (!ok) return;
    }
    app.ir('calendario');
  };

  const alSalirDeLaPagina = (ev: BeforeUnloadEvent) => {
    if (pendiente || guardando) ev.preventDefault();
  };
  window.addEventListener('beforeunload', alSalirDeLaPagina);

  /* ---------- Estructura ---------- */

  const contenido = h('div', { class: 'config-contenido' });
  const pestanas = h(
    'div',
    { class: 'pestanas', role: 'tablist' },
    ...SECCIONES.map(([id, icono, nombre]) =>
      h(
        'button',
        {
          type: 'button',
          role: 'tab',
          class: 'pestana',
          'aria-selected': String(id === seccion),
          onclick: () => {
            seccion = id;
            pintar();
          },
        },
        h('span', { 'aria-hidden': 'true', text: icono }),
        h('span', { text: nombre }),
      ),
    ),
  );

  raiz.append(
    h(
      'header',
      { class: 'cabecera cabecera-config' },
      h('h1', { class: 'titulo', text: '⚙ Configuración' }),
      indicador,
      boton('Listo', () => void terminar(), { icono: '✓', variante: 'primario' }),
    ),
    pestanas,
    contenido,
  );

  function pintar(): void {
    pestanas.querySelectorAll('.pestana').forEach((b, i) => b.setAttribute('aria-selected', String(SECCIONES[i][0] === seccion)));
    const pintores: Record<Seccion, () => HTMLElement> = {
      fechas: seccionFechas,
      personas: seccionPersonas,
      tipos: seccionTipos,
      dias: seccionDiasCulto,
      datos: seccionDatos,
    };
    contenido.replaceChildren(pintores[seccion]());
  }

  /* ---------- 📅 Fechas ---------- */

  function seccionFechas(): HTMLElement {
    const mes = mesEditado!;
    const fechas = fechasDelMes(datos, mes, true);

    const ir = (nuevo: Mes) => {
      mesEditado = nuevo;
      pintar();
    };

    const campoFecha = h('input', { type: 'date', class: 'campo', 'aria-label': 'Fecha a agregar' }) as HTMLInputElement;
    campoFecha.value = `${prefijoMes(mes)}01`;
    const agregar = h(
      'form',
      { class: 'agregar' },
      h('label', { class: 'etiqueta', text: '➕ Agregar una fecha' }),
      h('div', { class: 'fila-campos' }, campoFecha, boton('Agregar', () => undefined, { variante: 'primario' })),
    );
    (agregar.querySelector('button') as HTMLButtonElement).type = 'submit';
    agregar.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const fecha = campoFecha.value;
      if (!fecha) return;
      const habitual = datos.diasSemana.includes(diaSemana(fecha));
      const dia = (datos.dias[fecha] ??= { asignaciones: {} });
      if (!habitual) dia.extra = true;
      delete dia.oculto;
      // Se abre con una fila por cada tipo, lista para elegir a las personas.
      for (const r of datos.roles) dia.asignaciones[r.id] ??= '';
      cambio();
      mesEditado = mesDe(fecha);
      pintar();
      document.getElementById(`dia-${fecha}`)?.scrollIntoView({ block: 'center' });
    });

    return h(
      'section',
      { class: 'seccion' },
      datos.personas.length ? null : h('p', { class: 'aviso-fijo', text: 'Aún no hay personas. Agrégalas en 👥 Personas para poder elegirlas aquí.' }),
      h(
        'div',
        { class: 'nav-mes-fila' },
        boton('Anterior', () => ir(moverMes(mes, -1)), { icono: '◀', clase: 'btn-mes', etiqueta: 'Mes anterior' }),
        h('h2', { class: 'mes-titulo', text: nombreMes(mes) }),
        boton('Siguiente', () => ir(moverMes(mes, 1)), { icono: '▶', clase: 'btn-mes btn-icono-derecha', etiqueta: 'Mes siguiente' }),
      ),
      agregar,
      fechas.length
        ? h('div', { class: 'lista-editar' }, ...fechas.map(tarjetaFecha))
        : h('p', { class: 'vacio', text: 'No hay fechas este mes. Agrega una arriba o marca días de culto en 🗓️ Días de culto.' }),
    );
  }

  function tarjetaFecha(fecha: string): HTMLElement {
    const dia: Dia = datos.dias[fecha] ?? { asignaciones: {} };
    /** Guarda el día en los datos (o lo quita si quedó vacío). */
    const fijar = () => {
      if (diaVacio(dia)) delete datos.dias[fecha];
      else datos.dias[fecha] = dia;
      cambio();
    };

    const usados = Object.keys(dia.asignaciones);
    const filas = datos.roles
      .filter((r) => r.id in dia.asignaciones)
      .map((rol) => {
        const tipo = h('select', { class: 'campo', 'aria-label': 'Tipo' }) as HTMLSelectElement;
        for (const r of datos.roles) {
          tipo.append(h('option', { value: r.id, text: r.nombre, disabled: r.id !== rol.id && usados.includes(r.id) }));
        }
        tipo.value = rol.id;
        tipo.addEventListener('change', () => {
          // Se cambia el tipo conservando a la persona elegida, en el orden de los tipos.
          const persona = dia.asignaciones[rol.id];
          delete dia.asignaciones[rol.id];
          dia.asignaciones[tipo.value] = persona;
          fijar();
          pintar();
        });

        const actual = dia.asignaciones[rol.id];
        const persona = h('select', { class: 'campo', 'aria-label': `Persona para ${rol.nombre}` }) as HTMLSelectElement;
        persona.append(h('option', { value: '', text: '— Elegir persona —' }));
        const lista = ordenar(actual && !datos.personas.includes(actual) ? [...datos.personas, actual] : datos.personas);
        for (const p of lista) persona.append(h('option', { value: p, text: p }));
        persona.value = actual;
        persona.addEventListener('change', () => {
          dia.asignaciones[rol.id] = persona.value;
          fijar();
        });

        const quitar = h('button', {
          type: 'button',
          class: 'btn-icono-solo peligro',
          text: '✕',
          'aria-label': `Quitar ${rol.nombre}`,
          onclick: () => {
            delete dia.asignaciones[rol.id];
            fijar();
            pintar();
          },
        });
        return h('div', { class: 'fila-asignacion' }, tipo, persona, quitar);
      });

    const libre = datos.roles.find((r) => !(r.id in dia.asignaciones));
    const agregarFila = boton(
      'Agregar persona',
      () => {
        if (!libre) return;
        dia.asignaciones[libre.id] = '';
        datos.dias[fecha] = dia;
        pintar();
      },
      { icono: '➕', variante: 'suave', deshabilitado: !libre },
    );

    const nota = h('input', {
      type: 'text',
      class: 'campo',
      maxlength: LIMITES.nota,
      placeholder: 'Nota (opcional), p. ej. Día de Gracias',
      'aria-label': 'Nota del día',
    }) as HTMLInputElement;
    nota.value = dia.nota ?? '';
    nota.addEventListener('input', () => {
      if (nota.value.trim()) dia.nota = nota.value;
      else delete dia.nota;
      fijar();
    });

    const acciones = dia.extra
      ? boton(
          'Quitar esta fecha',
          async () => {
            if (!(await confirmar('Quitar fecha', `¿Quitar el ${fechaLarga(fecha)} del calendario?`, 'Sí, quitar'))) return;
            delete datos.dias[fecha];
            cambio();
            pintar();
          },
          { icono: '🗑', variante: 'peligro' },
        )
      : boton(
          dia.oculto ? 'Sí hay culto este día' : 'No hay culto este día',
          () => {
            if (dia.oculto) delete dia.oculto;
            else dia.oculto = true;
            fijar();
            pintar();
          },
          { icono: dia.oculto ? '✅' : '🚫', variante: 'suave' },
        );

    return h(
      'article',
      { class: `tarjeta-fecha${dia.oculto ? ' oculta' : ''}`, id: `dia-${fecha}` },
      h(
        'h3',
        { class: 'tarjeta-titulo' },
        fechaLarga(fecha),
        dia.extra ? h('span', { class: 'chip', text: 'Especial' }) : null,
        dia.oculto ? h('span', { class: 'chip chip-gris', text: 'No se celebra' }) : null,
      ),
      dia.oculto ? null : h('div', { class: 'pila-chica' }, ...filas, agregarFila, nota),
      acciones,
    );
  }

  /* ---------- 👥 Personas ---------- */

  function seccionPersonas(): HTMLElement {
    const usos = (nombre: string) =>
      Object.values(datos.dias).filter((d) => Object.values(d.asignaciones).includes(nombre)).length;

    const campo = h('input', {
      type: 'text',
      class: 'campo',
      maxlength: LIMITES.nombre,
      placeholder: 'p. ej. H. Rosa L.',
      'aria-label': 'Nombre de la persona',
    }) as HTMLInputElement;
    const agregar = h(
      'form',
      { class: 'agregar' },
      h('label', { class: 'etiqueta', text: '➕ Agregar persona' }),
      h('div', { class: 'fila-campos' }, campo, boton('Agregar', () => undefined, { variante: 'primario' })),
    );
    (agregar.querySelector('button') as HTMLButtonElement).type = 'submit';
    agregar.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const nombre = campo.value.replace(/\s+/g, ' ').trim();
      if (!nombre) return;
      if (datos.personas.includes(nombre)) {
        avisar(`«${nombre}» ya está en la lista`);
        return;
      }
      if (datos.personas.length >= LIMITES.personas) {
        avisar('La lista de personas está llena');
        return;
      }
      datos.personas.push(nombre);
      cambio();
      pintar();
      avisar(`✅ ${nombre} agregado`);
      (contenido.querySelector('.agregar input') as HTMLInputElement | null)?.focus();
    });

    const filas = ordenar(datos.personas).map((nombre) => {
      const entrada = h('input', {
        type: 'text',
        class: 'campo',
        maxlength: LIMITES.nombre,
        'aria-label': `Nombre de ${nombre}`,
      }) as HTMLInputElement;
      entrada.value = nombre;
      entrada.addEventListener('change', () => {
        const nuevo = entrada.value.replace(/\s+/g, ' ').trim();
        if (!nuevo || nuevo === nombre) {
          entrada.value = nombre;
          return;
        }
        if (datos.personas.includes(nuevo)) {
          avisar(`«${nuevo}» ya está en la lista`);
          entrada.value = nombre;
          return;
        }
        renombrarPersona(datos, nombre, nuevo);
        cambio();
        pintar();
      });
      const n = usos(nombre);
      return h(
        'div',
        { class: 'fila-mantenedor' },
        entrada,
        h('span', { class: 'conteo', text: n === 1 ? '1 fecha' : `${n} fechas` }),
        h('button', {
          type: 'button',
          class: 'btn-icono-solo peligro',
          text: '🗑',
          'aria-label': `Eliminar a ${nombre}`,
          onclick: async () => {
            const extra = n ? ` Las ${n === 1 ? 'fecha que ya tiene asignada la conserva' : `${n} fechas que ya tiene asignadas las conserva`}.` : '';
            if (!(await confirmar('Eliminar persona', `¿Quitar a ${nombre} de la lista?${extra}`, 'Sí, quitar'))) return;
            datos.personas = datos.personas.filter((p) => p !== nombre);
            cambio();
            pintar();
          },
        }),
      );
    });

    return h(
      'section',
      { class: 'seccion' },
      h('p', { class: 'ayuda-texto', text: 'Las personas de esta lista se eligen al asignar cada fecha. Si cambias un nombre, se cambia también en todas sus fechas.' }),
      agregar,
      filas.length ? h('div', { class: 'lista-mantenedor' }, ...filas) : h('p', { class: 'vacio', text: 'Aún no hay personas.' }),
    );
  }

  /* ---------- 🏷️ Tipos ---------- */

  function seccionTipos(): HTMLElement {
    const campo = h('input', {
      type: 'text',
      class: 'campo',
      maxlength: LIMITES.rol,
      placeholder: 'p. ej. Alabanza',
      'aria-label': 'Nombre del tipo',
    }) as HTMLInputElement;
    const lleno = datos.roles.length >= LIMITES.roles;
    const agregar = h(
      'form',
      { class: 'agregar' },
      h('label', { class: 'etiqueta', text: '➕ Agregar tipo' }),
      h('div', { class: 'fila-campos' }, campo, boton('Agregar', () => undefined, { variante: 'primario', deshabilitado: lleno })),
    );
    (agregar.querySelector('button') as HTMLButtonElement).type = 'submit';
    agregar.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const nombre = campo.value.replace(/\s+/g, ' ').trim();
      if (!nombre || lleno) return;
      if (datos.roles.some((r) => r.nombre.toLowerCase() === nombre.toLowerCase())) {
        avisar(`«${nombre}» ya existe`);
        return;
      }
      datos.roles.push({ id: idDeRol(nombre, datos.roles.map((r) => r.id)), nombre });
      cambio();
      pintar();
      avisar(`✅ Tipo «${nombre}» agregado`);
    });

    const mover = (i: number, delta: number) => {
      const [rol] = datos.roles.splice(i, 1);
      datos.roles.splice(i + delta, 0, rol);
      cambio();
      pintar();
    };

    const filas = datos.roles.map((rol, i) => {
      const entrada = h('input', { type: 'text', class: 'campo', maxlength: LIMITES.rol, 'aria-label': `Nombre del tipo ${rol.nombre}` }) as HTMLInputElement;
      entrada.value = rol.nombre;
      entrada.addEventListener('change', () => {
        const nuevo = entrada.value.replace(/\s+/g, ' ').trim();
        if (!nuevo) {
          entrada.value = rol.nombre;
          return;
        }
        rol.nombre = nuevo;
        cambio();
      });
      return h(
        'div',
        { class: 'fila-mantenedor' },
        entrada,
        h('button', { type: 'button', class: 'btn-icono-solo', text: '▲', 'aria-label': `Subir ${rol.nombre}`, disabled: i === 0, onclick: () => mover(i, -1) }),
        h('button', {
          type: 'button',
          class: 'btn-icono-solo',
          text: '▼',
          'aria-label': `Bajar ${rol.nombre}`,
          disabled: i === datos.roles.length - 1,
          onclick: () => mover(i, 1),
        }),
        h('button', {
          type: 'button',
          class: 'btn-icono-solo peligro',
          text: '🗑',
          'aria-label': `Eliminar ${rol.nombre}`,
          disabled: datos.roles.length === 1,
          onclick: async () => {
            const texto = `¿Eliminar el tipo «${rol.nombre}»? Se quitará de todas las fechas.`;
            if (!(await confirmar('Eliminar tipo', texto, 'Sí, eliminar'))) return;
            quitarRol(datos, rol.id);
            cambio();
            pintar();
          },
        }),
      );
    });

    return h(
      'section',
      { class: 'seccion' },
      h('p', { class: 'ayuda-texto', text: 'Los tipos son las tareas de cada culto (Coordinación, Predicación…). Se muestran en este orden.' }),
      agregar,
      h('div', { class: 'lista-mantenedor' }, ...filas),
    );
  }

  /* ---------- 🗓️ Días de culto ---------- */

  function seccionDiasCulto(): HTMLElement {
    return h(
      'section',
      { class: 'seccion' },
      h('p', { class: 'ayuda-texto', text: 'Marca los días de la semana en que hay culto. Aparecen solos en cada mes; otros días se agregan como fecha especial.' }),
      h(
        'div',
        { class: 'dias-semana' },
        ...ORDEN_SEMANA.map((d) => {
          const casilla = h('input', { type: 'checkbox', checked: datos.diasSemana.includes(d) }) as HTMLInputElement;
          casilla.addEventListener('change', () => {
            datos.diasSemana = casilla.checked ? [...datos.diasSemana, d] : datos.diasSemana.filter((x) => x !== d);
            cambio();
          });
          return h('label', { class: 'dia-semana' }, casilla, h('span', { text: DIAS[d] }));
        }),
      ),
    );
  }

  /* ---------- 💾 Datos ---------- */

  function seccionDatos(): HTMLElement {
    return h(
      'section',
      { class: 'seccion pila' },
      opcionesSinConexion(),
      h(
        'div',
        { class: 'opcion-config' },
        h('span', { class: 'etiqueta', text: '🔒 Sesión' }),
        h('p', { class: 'ayuda-texto', text: 'La sesión dura 12 horas en este navegador.' }),
        boton(
          'Cerrar sesión',
          async () => {
            await guardar();
            salir();
            app.ir('calendario');
          },
          { icono: '🚪', variante: 'secundario' },
        ),
      ),
    );
  }

  pintar();

  return () => {
    window.removeEventListener('beforeunload', alSalirDeLaPagina);
    clearTimeout(temporizador);
    // Si se salió con cambios pendientes, se intenta guardar igual.
    if (pendiente) void guardarCalendario(datos).then((g) => (app.datos = g)).catch(() => undefined);
  };
}
