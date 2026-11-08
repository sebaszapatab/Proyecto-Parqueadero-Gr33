import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly form = this.fb.nonNullable.group({
    usuario: ['', Validators.required],
    clave: ['', Validators.required],
  });
  readonly loading = signal(false);
  readonly error = signal('');

  entrar(): void {
    if (this.loading()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const { usuario, clave } = this.form.getRawValue();
    this.loading.set(true);
    this.error.set('');
    this.auth.login(usuario.trim(), clave).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigateByUrl(this.auth.inicioPorRol());
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.form.controls.clave.reset();
        this.error.set(
          error.status === 401
            ? 'Usuario o contraseña incorrectos.'
            : 'No se pudo conectar con el servicio. Intenta de nuevo.',
        );
      },
    });
  }
}
