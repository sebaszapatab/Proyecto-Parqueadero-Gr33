import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY, Observable, expand, map, reduce, throwError, timeout } from 'rxjs';
import { CeldaOcupacion } from '../models/celda';
import { EstadoPago } from '../models/pago';
import { Operador } from '../models/operador';
import { EntradaCrear, SalidaCrear, Estancia, EstadoVehiculo } from '../models/estancia';
import { API_BASE_URL } from './api.service';
import { CeldasService } from './celdas.service';
import { OperadoresService } from './operadores.service';

interface Pagina<T> {
  items: T[];
  offset: number;
  limit: number;
  total: number;
}

@Injectable({ providedIn: 'root' })
export class EstanciasService {
  private readonly http = inject(HttpClient);
  private readonly raiz = inject(API_BASE_URL);
  private readonly base = `${this.raiz}/estancias`;
  private readonly pagos = `${this.raiz}/pagos`;
  private readonly cells = inject(CeldasService);
  private readonly operators = inject(OperadoresService);

  entrada(data: EntradaCrear) {
    return this.http.post<Estancia>(`${this.base}/entrada`, data).pipe(timeout(15000));
  }
  salida(data: SalidaCrear) {
    return this.http.post<Estancia>(`${this.base}/salida`, data).pipe(timeout(15000));
  }
  consultar(placa: string) {
    return this.http
      .get<EstadoVehiculo>(`${this.base}/vehiculo/${encodeURIComponent(placa)}`)
      .pipe(timeout(15000));
  }
  /** Todas las celdas con la placa que las ocupa (null si están libres). */
  celdas(): Observable<CeldaOcupacion[]> {
    return this.cells.occupancy().pipe(map((respuesta) => respuesta.items));
  }
  estadoPago(placa: string) {
    return this.http
      .get<EstadoPago>(`${this.pagos}/estado/${encodeURIComponent(placa)}`)
      .pipe(timeout(15000));
  }
  operadores(): Observable<Operador[]> {
    return this.todas((offset) => this.operators.list(offset, 100));
  }

  private todas<T>(load: (offset: number) => Observable<Pagina<T>>): Observable<T[]> {
    return load(0).pipe(
      expand((page) => {
        const next = page.offset + page.items.length;
        if (next >= page.total) return EMPTY;
        if (!page.items.length)
          return throwError(() => new Error('Catálogo incompleto. Recarga las opciones.'));
        return load(next);
      }),
      reduce((items, page) => [...items, ...page.items], [] as T[]),
    );
  }
}
