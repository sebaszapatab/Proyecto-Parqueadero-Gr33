export type TipoVehiculo = 'MOTO' | 'AUTOMOVIL' | 'CAMIONETA';
// El backend envía los importes como texto decimal ("180000.00").
export type Importe = string | number;
export interface Tarifa {
  tipo: TipoVehiculo;
  valor: Importe;
}
export interface EstadoPago {
  placa: string;
  tipo: string;
  estado: 'vigente' | 'vencida' | 'sin_pago';
  vence: string | null;
  valor_mensualidad: Importe | null;
}
export interface Pago {
  id: number;
  placa: string;
  marca: string;
  tipo: string;
  monto: Importe;
  desde: string;
  hasta: string;
  creado: string;
  registrado_por: string;
  anulado: boolean;
  motivo_anulacion: string | null;
  anulado_por: string | null;
  anulado_en: string | null;
}
export interface PagosPagina {
  items: Pago[];
  total: number;
  offset: number;
  limit: number;
  total_recaudado: Importe;
}
export interface Vencidos {
  items: EstadoPago[];
  total: number;
}
