import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Novedades } from './novedades';

describe('Novedades', () => {
  let http: HttpTestingController;
  let c: Novedades;
  const novedad = {
    id: 1, estancia_id: 2, placa: 'ABC123', celda: 'C-01', tipo: 'DANO', momento: 'ENTRADA',
    descripcion: 'Rayón en la puerta', registrada_por: 'Ana', creada: '2026-11-19T15:00:00Z',
  };
  const pagina = { items: [novedad], total: 1, offset: 0, limit: 10 };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Novedades], providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    c = TestBed.createComponent(Novedades).componentInstance;
    http.expectOne('/novedades?offset=0&limit=10').flush(pagina);
  });
  afterEach(() => http.verify());

  it('carga el listado y traduce el tipo', () => {
    expect(c.items().length).toBe(1);
    expect(c.etiquetaTipo('OBJETO_OLVIDADO')).toBe('Objeto olvidado');
  });

  it('no envía una novedad con campos vacíos', () => {
    c.form.setValue({ placa: ' ', tipo: 'DANO', momento: 'ENTRADA', descripcion: '' });
    c.guardar();
    http.expectNone((r) => r.method === 'POST');
    expect(c.actionError()).toContain('Revisa los campos');
  });

  it('registra la novedad normalizada y recarga el listado', () => {
    c.form.setValue({ placa: ' abc123 ', tipo: 'OBJETO_OLVIDADO', momento: 'SALIDA', descripcion: ' Dejó un casco ' });
    c.guardar();
    c.guardar();
    const req = http.expectOne({ method: 'POST', url: '/novedades' });
    expect(req.request.body).toEqual({ placa: 'ABC123', tipo: 'OBJETO_OLVIDADO', momento: 'SALIDA', descripcion: 'Dejó un casco' });
    req.flush(novedad);
    http.expectOne('/novedades?offset=0&limit=10').flush(pagina);
    expect(c.success()).toContain('ABC123');
  });

  it('muestra el motivo cuando el servidor rechaza la novedad', () => {
    c.form.setValue({ placa: 'ABC123', tipo: 'DANO', momento: 'SALIDA', descripcion: 'Golpe' });
    c.guardar();
    http.expectOne('/novedades').flush({ detail: 'El vehículo aún no ha salido: registra la novedad como de entrada.' }, { status: 409, statusText: 'Conflict' });
    expect(c.actionError()).toContain('aún no ha salido');
    expect(c.saving()).toBe(false);
  });
});
