import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timeout } from 'rxjs';
import { API_BASE_URL } from '../services/api.service';

interface EstadoSistema {
  api: string;
  base_datos: string;
  migracion: string | null;
  conteos: Record<string, number>;
}

@Component({
  selector: 'app-sistema',
  templateUrl: './sistema.html',
  styleUrl: './sistema.css',
})
export class Sistema {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  private readonly destroy = inject(DestroyRef);
  readonly estado = signal<EstadoSistema | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly etiquetas: Record<string, string> = {
    vehiculos: 'Vehículos registrados',
    celdas: 'Celdas',
    estancias_abiertas: 'Vehículos dentro',
    usuarios_activos: 'Usuarios activos',
    pagos_registrados: 'Pagos registrados (cantidad)',
  };

  constructor() {
    this.cargar();
  }

  cargar(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.http
      .get<EstadoSistema>(`${this.base}/sistema/estado`)
      .pipe(timeout(15000), takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (estado) => {
          this.loading.set(false);
          this.estado.set(estado);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('No se pudo consultar el estado del sistema.');
        },
      });
  }

  claves(conteos: Record<string, number>): string[] {
    return Object.keys(conteos);
  }
}
