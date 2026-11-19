import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Movimiento, ReporteMovimientos } from '../models/reporte';
import { ReportesService } from '../services/reportes.service';

@Component({
  selector: 'app-reportes',
  imports: [ReactiveFormsModule],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css',
})
export class Reportes {
  private readonly api = inject(ReportesService);
  private readonly destroy = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  readonly filtro = this.fb.nonNullable.group({ desde: [''], hasta: [''], placa: [''] });
  readonly items = signal<Movimiento[]>([]);
  readonly total = signal(0);
  readonly entradas = signal(0);
  readonly salidas = signal(0);
  readonly dentro = signal(0);
  readonly offset = signal(0);
  readonly limit = 15;
  readonly loading = signal(false);
  readonly exporting = signal(false);
  readonly error = signal('');
  readonly page = computed(() => Math.floor(this.offset() / this.limit) + 1);
  readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit)));

  constructor() {
    this.load(0);
  }

  fecha(value: string | null): string {
    if (!value) return '—';
    return new Intl.DateTimeFormat('es-CO', {
      timeZone: 'America/Bogota',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  duracion(minutos: number | null): string {
    if (minutos === null) return 'Dentro';
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return h ? `${h} h ${m} min` : `${m} min`;
  }

  private valores() {
    const f = this.filtro.getRawValue();
    return { desde: f.desde, hasta: f.hasta, placa: f.placa.trim() };
  }

  /** Valida el rango antes de consultar. */
  private rangoInvalido(): boolean {
    const { desde, hasta } = this.valores();
    if (desde && hasta && desde > hasta) {
      this.error.set('La fecha inicial no puede ser posterior a la final.');
      return true;
    }
    return false;
  }

  load(offset = this.offset()): void {
    if (this.loading() || this.rangoInvalido()) return;
    const f = this.valores();
    this.loading.set(true);
    this.error.set('');
    this.api
      .movimientos(offset, this.limit, f.desde, f.hasta, f.placa)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data: ReporteMovimientos) => {
          this.loading.set(false);
          this.items.set(data.items);
          this.total.set(data.total);
          this.entradas.set(data.entradas);
          this.salidas.set(data.salidas);
          this.dentro.set(data.dentro);
          this.offset.set(offset);
        },
        error: (error: HttpErrorResponse) => {
          this.loading.set(false);
          this.error.set(this.mensaje(error));
        },
      });
  }

  limpiar(): void {
    this.filtro.reset({ desde: '', hasta: '', placa: '' });
    this.load(0);
  }

  /** Descarga todas las filas del filtro (hasta 500) como CSV que abre Excel. */
  exportarCsv(): void {
    if (this.exporting() || this.rangoInvalido()) return;
    const f = this.valores();
    this.exporting.set(true);
    this.error.set('');
    this.api
      .movimientos(0, 500, f.desde, f.hasta, f.placa)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => {
          this.exporting.set(false);
          const celda = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
          const filas = [
            ['Placa', 'Tipo', 'Celda', 'Entrada', 'Salida', 'Operador entrada', 'Operador salida', 'Minutos'],
            ...data.items.map((m) => [
              m.placa, m.tipo_vehiculo, m.celda, this.fecha(m.entrada), m.salida ? this.fecha(m.salida) : '',
              m.operador_entrada, m.operador_salida ?? '', m.minutos ?? '',
            ]),
          ];
          const texto = '\uFEFF' + filas.map((r) => r.map(celda).join(';')).join('\r\n');
          const url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }));
          const a = document.createElement('a');
          a.href = url;
          a.download = 'reporte_entradas_salidas.csv';
          a.click();
          URL.revokeObjectURL(url);
        },
        error: (error: HttpErrorResponse) => {
          this.exporting.set(false);
          this.error.set(this.mensaje(error));
        },
      });
  }

  private mensaje(error: HttpErrorResponse): string {
    if (typeof error.error?.detail === 'string' && [403, 422].includes(error.status))
      return error.error.detail;
    return 'No se pudo conectar con el servicio. Comprueba la conexión e intenta de nuevo.';
  }
}
