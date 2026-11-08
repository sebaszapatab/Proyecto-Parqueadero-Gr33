import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { timeout } from 'rxjs';
import { EstadoPago, Pago, PagosPagina, Tarifa, TipoVehiculo, Vencidos } from '../models/pago';
import { API_BASE_URL } from './api.service';

@Injectable({ providedIn: 'root' })
export class PagosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL)}/pagos`;

  tarifas() {
    return this.http.get<Tarifa[]>(`${this.url}/tarifas`).pipe(timeout(15000));
  }
  cambiarTarifa(tipo: TipoVehiculo, valor: number) {
    return this.http.put<Tarifa>(`${this.url}/tarifas/${tipo}`, { valor }).pipe(timeout(15000));
  }
  estado(placa: string) {
    return this.http
      .get<EstadoPago>(`${this.url}/estado/${encodeURIComponent(placa)}`)
      .pipe(timeout(15000));
  }
  vencidos() {
    return this.http.get<Vencidos>(`${this.url}/vencidos`).pipe(timeout(15000));
  }
  registrar(placa: string) {
    return this.http.post<Pago>(this.url, { placa }).pipe(timeout(15000));
  }
  anular(id: number, motivo: string) {
    return this.http.post<Pago>(`${this.url}/${id}/anular`, { motivo }).pipe(timeout(15000));
  }
  listar(offset: number, limit: number, desde: string, hasta: string, placa: string) {
    let params = new HttpParams().set('offset', offset).set('limit', limit);
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    if (placa) params = params.set('placa', placa);
    return this.http.get<PagosPagina>(this.url, { params }).pipe(timeout(15000));
  }
}
