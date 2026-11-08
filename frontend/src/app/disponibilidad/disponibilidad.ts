import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CeldaOcupacion } from '../models/celda';
import { CeldasService } from '../services/celdas.service';

@Component({
  selector: 'app-disponibilidad',
  templateUrl: './disponibilidad.html',
  styleUrl: './disponibilidad.css',
})
export class Disponibilidad {
  private readonly api = inject(CeldasService);
  private readonly destroyRef = inject(DestroyRef);

  readonly cells = signal<CeldaOcupacion[]>([]);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly error = signal('');

  readonly cars = computed(() => this.cells().filter((cell) => !this.isMoto(cell)));
  readonly motos = computed(() => this.cells().filter((cell) => this.isMoto(cell)));
  readonly occupied = computed(() => this.cells().filter((cell) => cell.placa !== null).length);
  readonly free = computed(() => this.cells().length - this.occupied());
  readonly occupiedCars = computed(() => this.cars().filter((cell) => cell.placa !== null).length);
  readonly occupiedMotos = computed(
    () => this.motos().filter((cell) => cell.placa !== null).length,
  );

  constructor() {
    this.load();
  }

  load(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.api
      .occupancy()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.cells.set(data.items);
          this.loaded.set(true);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set(
            'No se pudo cargar la disponibilidad. Comprueba la conexión y vuelve a intentar.',
          );
        },
      });
  }

  isMoto(cell: CeldaOcupacion): boolean {
    return cell.tipo.trim().toUpperCase() === 'MOTO';
  }
}
