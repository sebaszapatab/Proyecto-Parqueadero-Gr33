export interface Movimiento {
  id: number;
  placa: string;
  tipo_vehiculo: string;
  celda: string;
  entrada: string;
  salida: string | null;
  operador_entrada: string;
  operador_salida: string | null;
  minutos: number | null;
}
export interface ReporteMovimientos {
  items: Movimiento[];
  total: number;
  offset: number;
  limit: number;
  entradas: number;
  salidas: number;
  dentro: number;
}
export interface ErrorRegistrado {
  id: number;
  creado: string;
  metodo: string;
  ruta: string;
  estado: number;
  mensaje: string;
}
export interface Bitacora {
  items: ErrorRegistrado[];
  total: number;
}
