import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Reportes } from './reportes';

describe('Reporte de entradas y salidas', () => {
  let http: HttpTestingController;
  let c: Reportes;
  const fila = {
    id: 1, placa: 'ABC123', tipo_vehiculo: 'AUTOMOVIL', celda: 'C-01', entrada: '2026-11-19T15:00:00Z',
    salida: '2026-11-19T17:15:00Z', operador_entrada: 'Ana', operador_salida: 'Luis', minutos: 135,
  };
  const respuesta = { items: [fila], total: 1, offset: 0, limit: 15, entradas: 1, salidas: 1, dentro: 0 };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Reportes], providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    c = TestBed.createComponent(Reportes).componentInstance;
    http.expectOne('/reportes/movimientos?offset=0&limit=15').flush(respuesta);
  });
  afterEach(() => http.verify());

  it('muestra el resumen y formatea la duración', () => {
    expect(c.entradas()).toBe(1);
    expect(c.salidas()).toBe(1);
    expect(c.duracion(135)).toBe('2 h 15 min');
    expect(c.duracion(45)).toBe('45 min');
    expect(c.duracion(null)).toBe('Dentro');
  });

  it('envía el rango de fechas y la placa al consultar', () => {
    c.filtro.setValue({ desde: '2026-11-01', hasta: '2026-11-19', placa: ' abc123 ' });
    c.load(0);
    http.expectOne('/reportes/movimientos?offset=0&limit=15&desde=2026-11-01&hasta=2026-11-19&placa=abc123').flush(respuesta);
  });

  it('no consulta si la fecha inicial es posterior a la final', () => {
    c.filtro.setValue({ desde: '2026-11-19', hasta: '2026-11-01', placa: '' });
    c.load(0);
    http.expectNone((r) => r.url.startsWith('/reportes'));
    expect(c.error()).toContain('no puede ser posterior');
  });
});
