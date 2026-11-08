import { Routes } from '@angular/router';
import { requiereRol } from './services/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Iniciar sesión | Autos Colombia',
    loadComponent: () => import('./login/login').then((m) => m.Login),
  },
  {
    path: 'control-acceso',
    title: 'Control de acceso | Autos Colombia',
    canActivate: [requiereRol('operador')],
    loadComponent: () => import('./control-acceso/control-acceso').then((m) => m.ControlAcceso),
  },
  {
    path: 'disponibilidad',
    title: 'Disponibilidad | Autos Colombia',
    canActivate: [requiereRol('operador', 'administrador')],
    loadComponent: () => import('./disponibilidad/disponibilidad').then((m) => m.Disponibilidad),
  },
  {
    path: 'gestion/operadores',
    title: 'Operadores | Autos Colombia',
    canActivate: [requiereRol('administrador')],
    loadComponent: () => import('./operadores/operadores').then((m) => m.Operadores),
  },
  {
    path: 'gestion/celdas',
    title: 'Celdas | Autos Colombia',
    canActivate: [requiereRol('administrador')],
    loadComponent: () => import('./celdas/celdas').then((m) => m.Celdas),
  },
  {
    path: 'gestion/vehiculos',
    title: 'Vehículos | Autos Colombia',
    canActivate: [requiereRol('operador', 'administrador')],
    loadComponent: () => import('./vehiculos/vehiculos').then((m) => m.Vehiculos),
  },
  {
    path: 'gestion/usuarios',
    title: 'Usuarios | Autos Colombia',
    canActivate: [requiereRol('administrador')],
    loadComponent: () => import('./usuarios/usuarios').then((m) => m.Usuarios),
  },
  {
    path: 'gestion/pagos',
    title: 'Pagos | Autos Colombia',
    canActivate: [requiereRol('operador', 'administrador')],
    loadComponent: () => import('./pagos/pagos').then((m) => m.Pagos),
  },
  {
    path: 'sistema',
    title: 'Estado del sistema | Autos Colombia',
    canActivate: [requiereRol('desarrollador')],
    loadComponent: () => import('./sistema/sistema').then((m) => m.Sistema),
  },
  {
    path: '',
    pathMatch: 'full',
    title: 'Inicio | Autos Colombia',
    canActivate: [requiereRol('operador', 'administrador')],
    loadComponent: () => import('./home/home').then((m) => m.Home),
  },
  { path: '**', redirectTo: '' },
];
