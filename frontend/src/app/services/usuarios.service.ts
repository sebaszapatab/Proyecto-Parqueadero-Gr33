import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { timeout } from 'rxjs';
import { Usuario, UsuarioActualizar, UsuarioCrear, UsuariosPagina } from '../models/usuario';
import { API_BASE_URL } from './api.service';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL)}/usuarios`;

  list(offset: number, limit: number) {
    return this.http
      .get<UsuariosPagina>(this.url, { params: { offset, limit } })
      .pipe(timeout(15000));
  }
  create(data: UsuarioCrear) {
    return this.http.post<Usuario>(this.url, data).pipe(timeout(15000));
  }
  update(id: number, data: UsuarioActualizar) {
    return this.http.patch<Usuario>(`${this.url}/${id}`, data).pipe(timeout(15000));
  }
}
