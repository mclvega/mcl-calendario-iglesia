import { describe, expect, it } from 'vitest';
import { deISO, fechaLarga, fechasPorSemana, moverMes, nombreMes, sumarDias } from '../src/core/fechas';

describe('fechas', () => {
  it('genera martes, jueves y domingo de noviembre de 2026', () => {
    const fechas = fechasPorSemana({ anio: 2026, mes: 10 }, [2, 4, 0]);
    expect(fechas).toContain('2026-11-10');
    expect(fechas).toContain('2026-11-12');
    expect(fechas).toContain('2026-11-15');
    expect(fechas).not.toContain('2026-11-11');
    expect(fechas).toHaveLength(13);
  });

  it('escribe la fecha en palabras', () => {
    expect(fechaLarga('2026-11-24')).toBe('Martes 24 de noviembre');
    expect(fechaLarga('2026-12-06', true)).toBe('Domingo 6 de diciembre de 2026');
  });

  it('rechaza fechas imposibles', () => {
    expect(deISO('2026-02-30')).toBeNull();
    expect(deISO('hola')).toBeNull();
  });

  it('suma días y cambia de mes y año', () => {
    expect(sumarDias('2026-11-30', 1)).toBe('2026-12-01');
    expect(moverMes({ anio: 2026, mes: 11 }, 1)).toEqual({ anio: 2027, mes: 0 });
    expect(moverMes({ anio: 2026, mes: 0 }, -1)).toEqual({ anio: 2025, mes: 11 });
    expect(nombreMes({ anio: 2026, mes: 10 })).toBe('Noviembre 2026');
  });
});
