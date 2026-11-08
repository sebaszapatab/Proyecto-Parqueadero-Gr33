import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Rol } from '../models/usuario';
import { AuthService } from './auth.service';

/** Exige sesión iniciada y, opcionalmente, uno de los roles indicados. */
export const requiereRol =
  (...roles: Rol[]): CanActivateFn =>
  () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.autenticado()) return router.createUrlTree(['/login']);
    if (roles.length && !auth.tieneRol(...roles)) return router.createUrlTree([auth.inicioPorRol()]);
    return true;
  };
