export type TipoNovedad = 'DANO' | 'OBJETO_OLVIDADO' | 'OTRO';
export type Momento = 'ENTRADA' | 'SALIDA';
export const TIPOS_NOVEDAD: { value: TipoNovedad; label: string }[] = [
  { value: 'DANO', label: 'Daño' },
  { value: 'OBJETO_OLVIDADO', label: 'Objeto olvidado' },
  { value: 'OTRO', label: 'Otro' },
];
export const MOMENTOS: { value: Momento; label: string }[] = [
  { value: 'ENTRADA', label: 'En la entrada' },
  { value: 'SALIDA', label: 'En la salida' },
];
export interface NovedadCrear {
  placa: string;
  tipo: TipoNovedad;
  momento: Momento;
  descripcion: string;
}
export interface Novedad extends NovedadCrear {
  id: number;
  estancia_id: number;
  celda: string;
  registrada_por: string;
  creada: string;
}
export interface NovedadesPagina {
  items: Novedad[];
  total: number;
  offset: number;
  limit: number;
}
