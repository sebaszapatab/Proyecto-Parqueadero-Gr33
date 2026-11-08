export interface CeldaCrear {
  codigo: string;
  tipo: string;
}
export type CeldaActualizar = Partial<CeldaCrear>;
export interface Celda extends CeldaCrear {
  id: number;
}
export interface CeldasPagina {
  items: Celda[];
  total: number;
  offset: number;
  limit: number;
}
export interface CeldaOcupacion {
  id: number;
  codigo: string;
  tipo: string;
  placa: string | null;
}
export interface OcupacionCeldas {
  items: CeldaOcupacion[];
  total: number;
  ocupadas: number;
  libres: number;
}
