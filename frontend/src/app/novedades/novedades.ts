import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { MOMENTOS, Momento, Novedad, TIPOS_NOVEDAD, TipoNovedad } from '../models/novedad';
import { AuthService } from '../services/auth.service';
import { NovedadesService } from '../services/novedades.service';

const nonBlank: ValidatorFn = (control) =>
  typeof control.value === 'string' && control.value.trim() ? null : { required: true };

@Component({
  selector: 'app-novedades',
  imports: [ReactiveFormsModule],
  templateUrl: './novedades.html',
  styleUrl: './novedades.css',
})
export class Novedades {
  private readonly api = inject(NovedadesService);
  private readonly destroy = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);
  readonly tipos = TIPOS_NOVEDAD;
  readonly momentos = MOMENTOS;

  readonly form = this.fb.nonNullable.group({
    placa: ['', nonBlank],
    tipo: ['DANO' as TipoNovedad],
    momento: ['ENTRADA' as Momento],
    descripcion: ['', [nonBlank, Validators.maxLength(500)]],
  });
  readonly filtro = this.fb.nonNullable.group({ desde: [''], hasta: [''], placa: [''] });

  readonly items = signal<Novedad[]>([]);
  readonly total = signal(0);
  readonly offset = signal(0);
  readonly limit = 10;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly busy = computed(() => this.loading() || this.saving());
  readonly listError = signal('');
  readonly actionError = signal('');
  readonly success = signal('');
  readonly page = computed(() => Math.floor(this.offset() / this.limit) + 1);
  readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit)));

  constructor() {
    this.load(0);
  }

  etiquetaTipo(tipo: TipoNovedad): string {
    return this.tipos.find((t) => t.value === tipo)?.label ?? tipo;
  }

  etiquetaMomento(momento: Momento): string {
    return momento === 'ENTRADA' ? 'Entrada' : 'Salida';
  }

  fecha(value: string): string {
    return new Intl.DateTimeFormat('es-CO', {
      timeZone: 'America/Bogota',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  load(offset = this.offset()): void {
    if (this.loading()) return;
    const f = this.filtro.getRawValue();
    this.loading.set(true);
    this.listError.set('');
    this.api
      .list(offset, this.limit, f.desde, f.hasta, f.placa.trim())
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => {
          this.loading.set(false);
          this.items.set(data.items);
          this.total.set(data.total);
          this.offset.set(offset);
        },
        error: (error: HttpErrorResponse) => {
          this.loading.set(false);
          this.listError.set(this.mensaje(error));
        },
      });
  }

  guardar(): void {
    if (this.busy()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.actionError.set('Revisa los campos señalados antes de guardar la novedad.');
      return;
    }
    const v = this.form.getRawValue();
    const data = {
      placa: v.placa.trim().toUpperCase(),
      tipo: v.tipo,
      momento: v.momento,
      descripcion: v.descripcion.trim(),
    };
    this.saving.set(true);
    this.actionError.set('');
    this.success.set('');
    this.api
      .create(data)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (novedad) => {
          this.saving.set(false);
          this.success.set(`Novedad registrada para ${novedad.placa} (celda ${novedad.celda}).`);
          this.form.reset({ placa: '', tipo: 'DANO', momento: 'ENTRADA', descripcion: '' });
          this.load(0);
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.actionError.set(this.mensaje(error));
        },
      });
  }

  private mensaje(error: HttpErrorResponse): string {
    if (typeof error.error?.detail === 'string' && [403, 404, 409].includes(error.status))
      return error.error.detail;
    if (error.status === 422) return 'Revisa los datos: hay campos que no cumplen las validaciones.';
    return 'No se pudo conectar con el servicio. Comprueba la conexión e intenta de nuevo.';
  }
}
