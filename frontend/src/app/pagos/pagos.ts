import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidatorFn } from '@angular/forms';
import { Observable } from 'rxjs';
import { EstadoPago, Importe, Pago, Tarifa, TipoVehiculo, Vencidos } from '../models/pago';
import { AuthService } from '../services/auth.service';
import { PagosService } from '../services/pagos.service';

const nonBlank: ValidatorFn = (control) =>
  typeof control.value === 'string' && control.value.trim() ? null : { required: true };

@Component({
  selector: 'app-pagos',
  imports: [ReactiveFormsModule],
  templateUrl: './pagos.html',
  styleUrl: './pagos.css',
})
export class Pagos {
  private readonly api = inject(PagosService);
  private readonly destroy = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);

  readonly cobro = this.fb.nonNullable.group({ placa: ['', nonBlank] });
  readonly filtro = this.fb.nonNullable.group({ desde: [''], hasta: [''], placa: [''] });
  readonly motivo = this.fb.nonNullable.control('', nonBlank);
  readonly valores = new FormGroup<Record<string, FormControl<string>>>({});

  readonly tarifas = signal<Tarifa[]>([]);
  readonly estado = signal<EstadoPago | null>(null);
  readonly comprobante = signal<Pago | null>(null);
  readonly vencidos = signal<Vencidos | null>(null);
  readonly pagos = signal<Pago[]>([]);
  readonly total = signal(0);
  readonly recaudado = signal<Importe>(0);
  readonly offset = signal(0);
  readonly limit = 10;
  readonly anulando = signal<Pago | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly page = computed(() => Math.floor(this.offset() / this.limit) + 1);
  readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit)));

  constructor() {
    this.cargarVencidos();
    if (this.auth.esAdmin()) {
      this.cargarTarifas();
      this.cargarPagos(0);
    }
  }

  moneda(value: Importe | null | undefined): string {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(Number(value));
  }

  fecha(value: string): string {
    // Las fechas de periodo llegan como AAAA-MM-DD; se muestran sin convertir zona horaria.
    const [y, m, d] = value.slice(0, 10).split('-').map(Number);
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(y, m - 1, d));
  }

  fechaHora(value: string): string {
    return new Intl.DateTimeFormat('es-CO', {
      timeZone: 'America/Bogota',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  /** Días que le quedan a la mensualidad (0 = vence hoy), con la fecha de Bogotá. */
  diasRestantes(vence: string): number {
    const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
    const [y1, m1, d1] = hoy.split('-').map(Number);
    const [y2, m2, d2] = vence.slice(0, 10).split('-').map(Number);
    return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
  }

  /** Batería de un mes: se vacía día a día; alarma cuando falta 1 día o menos. */
  bateria(i: EstadoPago): { pct: number; nivel: 'ok' | 'medio' | 'alarma' | 'vacia'; texto: string } {
    if (!i.vence || i.estado === 'sin_pago') return { pct: 0, nivel: 'vacia', texto: 'Sin pago' };
    const dias = this.diasRestantes(i.vence);
    if (dias < 0) return { pct: 0, nivel: 'vacia', texto: `Vencida hace ${-dias} ${-dias === 1 ? 'día' : 'días'}` };
    const pct = Math.min(100, Math.round((dias / 30) * 100));
    if (dias === 0) return { pct: 3, nivel: 'alarma', texto: '¡Vence hoy!' };
    if (dias === 1) return { pct: pct, nivel: 'alarma', texto: '¡Vence mañana!' };
    return { pct, nivel: dias <= 7 ? 'medio' : 'ok', texto: `${dias} días` };
  }

  readonly porVencer = computed(() =>
    (this.vencidos()?.items ?? []).filter((i) => {
      if (i.estado !== 'vigente' || !i.vence) return false;
      return this.diasRestantes(i.vence) <= 1;
    }),
  );

  etiquetaEstado(e: EstadoPago['estado']): string {
    return { vigente: 'Al día', vencida: 'Vencida', sin_pago: 'Sin pagos' }[e];
  }

  // ---- Tarifas ----
  cargarTarifas(): void {
    this.api
      .tarifas()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (tarifas) => {
          this.tarifas.set(tarifas);
          for (const t of tarifas)
            if (!(t.tipo in this.valores.controls))
              this.valores.addControl(t.tipo, this.fb.nonNullable.control(String(Number(t.valor))));
            else this.valores.controls[t.tipo].setValue(String(Number(t.valor)));
        },
        error: (e) => this.error.set(this.mensaje(e)),
      });
  }

  guardarTarifa(tipo: TipoVehiculo): void {
    if (this.busy()) return;
    const valor = Number(this.valores.controls[tipo].value);
    if (!Number.isFinite(valor) || valor <= 0) {
      this.error.set('La tarifa debe ser un número mayor que cero.');
      return;
    }
    this.ejecutar(this.api.cambiarTarifa(tipo, valor), () => {
      this.success.set(`Tarifa de ${tipo} actualizada.`);
      this.cargarTarifas();
    });
  }

  // ---- Cobro ----
  consultar(): void {
    if (this.busy()) return;
    this.cobro.markAllAsTouched();
    if (this.cobro.invalid) return;
    const placa = this.cobro.controls.placa.value.trim().toUpperCase();
    this.cobro.controls.placa.setValue(placa);
    this.estado.set(null);
    this.comprobante.set(null);
    this.ejecutar(this.api.estado(placa), (estado) => this.estado.set(estado));
  }

  cobrar(): void {
    const estado = this.estado();
    if (this.busy() || !estado) return;
    this.ejecutar(this.api.registrar(estado.placa), (pago) => {
      this.comprobante.set(pago);
      this.estado.set(null);
      this.success.set(`Pago registrado para ${pago.placa}. Vigente hasta ${this.fecha(pago.hasta)}.`);
      this.cargarVencidos();
      if (this.auth.esAdmin()) this.cargarPagos(0);
    });
  }

  imprimir(): void {
    window.print();
  }

  // ---- Vencidos / reporte ----
  cargarVencidos(): void {
    this.api
      .vencidos()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({ next: (v) => this.vencidos.set(v), error: (e) => this.error.set(this.mensaje(e)) });
  }

  cargarPagos(offset = this.offset()): void {
    const f = this.filtro.getRawValue();
    this.api
      .listar(offset, this.limit, f.desde, f.hasta, f.placa.trim())
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => {
          this.pagos.set(data.items);
          this.total.set(data.total);
          this.recaudado.set(data.total_recaudado);
          this.offset.set(offset);
        },
        error: (e) => this.error.set(this.mensaje(e)),
      });
  }

  // ---- Anulación ----
  pedirAnular(pago: Pago): void {
    this.anulando.set(pago);
    this.motivo.reset();
    this.error.set('');
    this.success.set('');
  }

  confirmarAnular(): void {
    const pago = this.anulando();
    this.motivo.markAsTouched();
    if (!pago || this.busy() || this.motivo.invalid) return;
    this.ejecutar(this.api.anular(pago.id, this.motivo.value.trim()), () => {
      this.anulando.set(null);
      this.success.set(`Pago #${pago.id} anulado.`);
      this.comprobante.set(null);
      this.cargarVencidos();
      this.cargarPagos();
    });
  }

  verComprobante(pago: Pago): void {
    this.comprobante.set(pago);
    this.estado.set(null);
  }

  private ejecutar<T>(request: Observable<T>, ok: (value: T) => void): void {
    this.busy.set(true);
    this.error.set('');
    this.success.set('');
    request.pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (value) => {
        this.busy.set(false);
        ok(value);
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(this.mensaje(e));
      },
    });
  }

  private mensaje(error: HttpErrorResponse): string {
    if (typeof error.error?.detail === 'string' && [403, 404, 409].includes(error.status))
      return error.error.detail;
    if (error.status === 422) return 'Revisa los datos enviados.';
    return 'No se pudo conectar con el servicio. Intenta de nuevo.';
  }
}
