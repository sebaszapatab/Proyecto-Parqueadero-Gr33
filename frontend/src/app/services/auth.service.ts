import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, firstValueFrom, of, tap, timeout } from 'rxjs';
import { LoginRespuesta, Rol, Usuario } from '../models/usuario';
import { API_BASE_URL } from './api.service';

const CLAVE_TOKEN = 'ac_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = `${inject(API_BASE_URL)}/auth`;
  private readonly _usuario = signal<Usuario | null>(null);

  readonly usuario = this._usuario.asReadonly();
  readonly autenticado = computed(() => this._usuario() !== null);
  readonly esAdmin = computed(() => this._usuario()?.rol === 'administrador');
  readonly esOperativo = computed(() => {
    const rol = this._usuario()?.rol;
    return rol === 'operador' || rol === 'administrador';
  });
  readonly esOperador = computed(() => this._usuario()?.rol === 'operador');
  readonly esTecnico = computed(() => this._usuario()?.rol === 'desarrollador');

  token(): string | null {
    try {
      return sessionStorage.getItem(CLAVE_TOKEN);
    } catch {
      return null;
    }
  }

  private guardar(token: string | null): void {
    try {
      if (token) sessionStorage.setItem(CLAVE_TOKEN, token);
      else sessionStorage.removeItem(CLAVE_TOKEN);
    } catch {
      /* sin almacenamiento: la sesión dura mientras la pestaña esté abierta en memoria */
    }
  }

  tieneRol(...roles: Rol[]): boolean {
    const rol = this._usuario()?.rol;
    return !!rol && roles.includes(rol);
  }

  /** Al abrir la aplicación: recupera la sesión si el token guardado sigue vigente. */
  restaurar(): Promise<void> {
    if (!this.token()) return Promise.resolve();
    return firstValueFrom(
      this.http.get<Usuario>(`${this.base}/me`).pipe(
        timeout(15000),
        tap((usuario) => this._usuario.set(usuario)),
        catchError(() => {
          this.guardar(null);
          return of(null);
        }),
      ),
    ).then(() => undefined);
  }

  login(usuario: string, clave: string) {
    return this.http.post<LoginRespuesta>(`${this.base}/login`, { usuario, clave }).pipe(
      timeout(15000),
      tap((respuesta) => {
        this.guardar(respuesta.token);
        this._usuario.set(respuesta.usuario);
      }),
    );
  }

  logout(): void {
    const habiaToken = !!this.token();
    if (habiaToken) this.http.post<void>(`${this.base}/logout`, {}).pipe(catchError(() => of(null))).subscribe();
    this.cerrarLocal();
  }

  /** Limpia la sesión local (también cuando el servidor responde 401). */
  cerrarLocal(): void {
    this.guardar(null);
    this._usuario.set(null);
    void this.router.navigateByUrl('/login');
  }

  inicioPorRol(): string {
    return this._usuario()?.rol === 'desarrollador' ? '/sistema' : '/';
  }
}
