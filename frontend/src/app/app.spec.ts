import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { AuthService } from './services/auth.service';

describe('Navegación', () => {
  const usuario = (rol: string) => ({
    token: 't',
    usuario: { id: 1, nombre: 'Ana', usuario: 'ana', rol, activo: true, creado: '2026-01-01T00:00:00Z' },
  });

  async function crear(rol?: string) {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    const fixture = TestBed.createComponent(App);
    if (rol) {
      TestBed.inject(AuthService).login('ana', 'clave-segura').subscribe();
      TestBed.inject(HttpTestingController).expectOne('/auth/login').flush(usuario(rol));
    }
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => sessionStorage.clear());

  it('sin sesión no muestra el menú', async () => {
    const root = await crear();
    expect(root.querySelector('nav')).toBeNull();
  });

  it('el operador opera: control de acceso, disponibilidad y pagos; nada de gestión', async () => {
    const root = await crear('operador');
    for (const ruta of ['/control-acceso', '/disponibilidad', '/gestion/vehiculos', '/gestion/pagos'])
      expect(root.querySelector(`a[href="${ruta}"]`)).not.toBeNull();
    for (const ruta of ['/gestion/usuarios', '/gestion/operadores', '/gestion/celdas', '/sistema'])
      expect(root.querySelector(`a[href="${ruta}"]`)).toBeNull();
  });

  it('el administrador gestiona pero no opera ni ve el sistema', async () => {
    const root = await crear('administrador');
    for (const ruta of ['/gestion/usuarios', '/gestion/operadores', '/gestion/celdas', '/gestion/pagos', '/disponibilidad'])
      expect(root.querySelector(`a[href="${ruta}"]`)).not.toBeNull();
    for (const ruta of ['/control-acceso', '/sistema'])
      expect(root.querySelector(`a[href="${ruta}"]`)).toBeNull();
  });

  it('el desarrollador solo ve el estado del sistema', async () => {
    const root = await crear('desarrollador');
    expect(root.querySelector('a[href="/sistema"]')).not.toBeNull();
    expect(root.querySelectorAll('nav a').length).toBe(1);
  });
});
