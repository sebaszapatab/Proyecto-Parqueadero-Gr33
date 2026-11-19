import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { timeout } from 'rxjs';
import { ReporteMovimientos } from '../models/reporte';
import { API_BASE_URL } from './api.service';

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL)}/reportes`;

  movimientos(offset: number, limit: number, desde: string, hasta: string, placa: string) {
    let params = new HttpParams().set('offset', offset).set('limit', limit);
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    if (placa) params = params.set('placa', placa);
    return this.http.get<ReporteMovimientos>(`${this.url}/movimientos`, { params }).pipe(timeout(15000));
  }
}
