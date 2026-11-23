import { describe, expect, it } from 'vitest';
import { fechasDelMes, hayCulto, idDeRol, normalizarDatos, proximoCulto, quitarRol, renombrarPersona } from '../src/core/datos';
import { datosIniciales } from '../src/core/semilla';

describe('datos', () => {
  it('la semilla de la pizarra pasa la validación sin cambios', () => {
    const semilla = datosIniciales();
    expect(normalizarDatos(semilla)).toEqual(semilla);
    expect(semilla.dias['2026-12-06']).toEqual({
      asignaciones: { coordinacion: 'H. David H.', predicacion: 'P. Eliasib A.' },
      nota: 'Día de Gracias',
    });
    expect(semilla.personas).toContain('P. Silvia R.');
  });

  it('rechaza datos sin forma', () => {
    expect(normalizarDatos(null)).toBeNull();
    expect(normalizarDatos('hola')).toBeNull();
    expect(normalizarDatos({ roles: [] })).toBeNull();
    expect(normalizarDatos({ roles: [{ id: 'MAL ID', nombre: 'x' }] })).toBeNull();
  });

  it('limpia fechas, tipos desconocidos, nombres vacíos y duplicados', () => {
    const datos = normalizarDatos({
      roles: [{ id: 'coordinacion', nombre: ' Coordinación ' }],
      personas: ['Ana', 'Ana', '  ', 7],
      diasSemana: [2, 2, 9, -1, 'x'],
      dias: {
        '2026-02-30': { asignaciones: { coordinacion: 'Ana' } },
        '2026-11-10': { asignaciones: { coordinacion: 'Ana', otro: 'Luis', vacio: '' } },
        '2026-11-12': { asignaciones: { coordinacion: '' } },
      },
    });
    expect(datos).toEqual({
      roles: [{ id: 'coordinacion', nombre: 'Coordinación' }],
      personas: ['Ana'],
      diasSemana: [2],
      dias: { '2026-11-10': { asignaciones: { coordinacion: 'Ana' } } },
    });
  });

  it('fechas del mes: días habituales, especiales y ocultos', () => {
    const datos = datosIniciales();
    datos.dias['2026-11-14'] = { asignaciones: {}, extra: true };
    datos.dias['2026-11-17'].oculto = true;
    const visibles = fechasDelMes(datos, { anio: 2026, mes: 10 });
    expect(visibles).toContain('2026-11-14');
    expect(visibles).not.toContain('2026-11-17');
    expect(fechasDelMes(datos, { anio: 2026, mes: 10 }, true)).toContain('2026-11-17');
    expect(hayCulto(datos, '2026-11-17')).toBe(false);
    expect(hayCulto(datos, '2026-11-11')).toBe(false);
  });

  it('próximo culto desde un lunes es el martes', () => {
    expect(proximoCulto(datosIniciales(), '2026-11-23')).toBe('2026-11-24');
    expect(proximoCulto(datosIniciales(), '2026-11-24')).toBe('2026-11-24');
  });

  it('renombrar persona cambia sus asignaciones', () => {
    const datos = datosIniciales();
    renombrarPersona(datos, 'P. Eliasib A.', 'Pastor Eliasib A.');
    expect(datos.personas).toContain('Pastor Eliasib A.');
    expect(datos.personas).not.toContain('P. Eliasib A.');
    expect(datos.dias['2026-11-22'].asignaciones.predicacion).toBe('Pastor Eliasib A.');
  });

  it('quitar tipo borra sus asignaciones y los días que quedan vacíos', () => {
    const datos = datosIniciales();
    datos.dias['2026-11-05'] = { asignaciones: { predicacion: 'Ana' } };
    quitarRol(datos, 'predicacion');
    expect(datos.roles.map((r) => r.id)).toEqual(['coordinacion']);
    expect(datos.dias['2026-11-10'].asignaciones).toEqual({ coordinacion: 'H. Rosa L.' });
    expect(datos.dias['2026-11-05']).toBeUndefined();
  });

  it('id de tipo sin acentos y único', () => {
    expect(idDeRol('Alabanza', [])).toBe('alabanza');
    expect(idDeRol('Predicación', ['predicacion'])).toBe('predicacion-2');
  });
});
