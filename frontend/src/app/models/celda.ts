export interface CeldaCrear {
  codigo: string;
  tipo: string;
}
export type CeldaActualizar = Partial<CeldaCrear> & { en_servicio?: boolean };
export interface Celda extends CeldaCrear {
  id: number;
  en_servicio: boolean;
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
  en_servicio: boolean;
}
export interface OcupacionCeldas {
  items: CeldaOcupacion[];
  total: number;
  ocupadas: number;
  libres: number;
  fuera_de_servicio: number;
}
