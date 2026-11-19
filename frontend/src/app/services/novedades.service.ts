import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { timeout } from 'rxjs';
import { Novedad, NovedadCrear, NovedadesPagina } from '../models/novedad';
import { API_BASE_URL } from './api.service';

@Injectable({ providedIn: 'root' })
export class NovedadesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL)}/novedades`;

  create(data: NovedadCrear) {
    return this.http.post<Novedad>(this.url, data).pipe(timeout(15000));
  }
  list(offset: number, limit: number, desde: string, hasta: string, placa: string) {
    let params = new HttpParams().set('offset', offset).set('limit', limit);
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    if (placa) params = params.set('placa', placa);
    return this.http.get<NovedadesPagina>(this.url, { params }).pipe(timeout(15000));
  }
}
