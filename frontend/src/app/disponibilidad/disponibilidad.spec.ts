import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Disponibilidad } from './disponibilidad';

describe('Disponibilidad de celdas', () => {
  let fixture: ComponentFixture<Disponibilidad>;
  let http: HttpTestingController;
  const respuesta = {
    items: [
      { id: 1, codigo: 'C-01', tipo: 'AUTOMOVIL', placa: 'ABC123' },
      { id: 2, codigo: 'C-02', tipo: 'AUTOMOVIL', placa: null },
      { id: 3, codigo: 'M-01', tipo: 'MOTO', placa: null },
    ],
    total: 3,
    ocupadas: 1,
    libres: 2,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Disponibilidad],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Disponibilidad);
    fixture.detectChanges();
  });
  afterEach(() => http.verify());

  it('muestra la placa en las celdas ocupadas y vacía en las libres', () => {
    http.expectOne('/celdas/ocupacion').flush(respuesta);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.cell').length).toBe(3);
    expect(root.querySelectorAll('.cell.occupied').length).toBe(1);
    expect(root.textContent).toContain('ABC123');
    expect(root.textContent).toContain('vacía');
  });

  it('separa las celdas de carros y de motos y cuenta las ocupadas', () => {
    http.expectOne('/celdas/ocupacion').flush(respuesta);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.cars().length).toBe(2);
    expect(component.motos().length).toBe(1);
    expect(component.occupied()).toBe(1);
    expect(component.free()).toBe(2);
  });

  it('muestra un error cuando el servicio no responde', () => {
    http.expectOne('/celdas/ocupacion').flush({}, { status: 503, statusText: 'Service Unavailable' });
    fixture.detectChanges();
    const alert = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('No se pudo cargar la disponibilidad');
  });
});
