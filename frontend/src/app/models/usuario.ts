export type Rol = 'operador' | 'administrador' | 'desarrollador';
export const ROLES: { value: Rol; label: string }[] = [
  { value: 'operador', label: 'Operador' },
  { value: 'administrador', label: 'Administrador' },
  { value: 'desarrollador', label: 'Desarrollador' },
];
export interface Usuario {
  id: number;
  nombre: string;
  usuario: string;
  rol: Rol;
  activo: boolean;
  creado: string;
}
export interface UsuarioCrear {
  nombre: string;
  usuario: string;
  clave: string;
  rol: Rol;
}
export type UsuarioActualizar = Partial<Pick<UsuarioCrear, 'nombre' | 'rol' | 'clave'>> & {
  activo?: boolean;
};
export interface UsuariosPagina {
  items: Usuario[];
  total: number;
  offset: number;
  limit: number;
}
export interface LoginRespuesta {
  token: string;
  usuario: Usuario;
}
