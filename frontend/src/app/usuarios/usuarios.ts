import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { ROLES, Rol, Usuario, UsuarioActualizar } from '../models/usuario';
import { AuthService } from '../services/auth.service';
import { UsuariosService } from '../services/usuarios.service';

const nonBlank: ValidatorFn = (control) =>
  typeof control.value === 'string' && control.value.trim() ? null : { required: true };

@Component({
  selector: 'app-usuarios',
  imports: [ReactiveFormsModule],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
})
export class Usuarios {
  private readonly api = inject(UsuariosService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);
  readonly roles = ROLES;
  readonly form = this.fb.group({
    nombre: this.fb.nonNullable.control('', nonBlank),
    usuario: this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/^[A-Za-z0-9._-]{3,30}$/)]),
    clave: this.fb.nonNullable.control('', [Validators.minLength(8), Validators.maxLength(128)]),
    rol: this.fb.nonNullable.control<Rol>('operador'),
    activo: this.fb.nonNullable.control(true),
  });
  readonly items = signal<Usuario[]>([]);
  readonly total = signal(0);
  readonly offset = signal(0);
  readonly limit = 10;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly busy = computed(() => this.loading() || this.saving());
  readonly showForm = signal(false);
  readonly editing = signal<Usuario | null>(null);
  readonly listError = signal('');
  readonly actionError = signal('');
  readonly success = signal('');
  readonly page = computed(() => Math.floor(this.offset() / this.limit) + 1);
  readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit)));

  constructor() {
    this.load();
  }

  load(offset = this.offset()): void {
    if (this.busy()) return;
    this.loading.set(true);
    this.listError.set('');
    this.api
      .list(offset, this.limit)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.loading.set(false);
          this.items.set(data.items);
          this.total.set(data.total);
          this.offset.set(offset);
        },
        error: (error) => {
          this.loading.set(false);
          this.listError.set(this.errorMessage(error));
        },
      });
  }

  nuevo(): void {
    if (this.busy()) return;
    this.form.reset({ nombre: '', usuario: '', clave: '', rol: 'operador', activo: true });
    this.form.controls.usuario.enable();
    this.form.controls.clave.setValidators([Validators.required, Validators.minLength(8), Validators.maxLength(128)]);
    this.form.controls.clave.updateValueAndValidity();
    this.editing.set(null);
    this.showForm.set(true);
    this.actionError.set('');
    this.success.set('');
  }

  editar(user: Usuario): void {
    if (this.busy()) return;
    this.form.reset({ nombre: user.nombre, usuario: user.usuario, clave: '', rol: user.rol, activo: user.activo });
    this.form.controls.usuario.disable();
    this.form.controls.clave.setValidators([Validators.minLength(8), Validators.maxLength(128)]);
    this.form.controls.clave.updateValueAndValidity();
    this.editing.set(user);
    this.showForm.set(true);
    this.actionError.set('');
    this.success.set('');
  }

  cancelar(): void {
    if (this.busy()) return;
    this.showForm.set(false);
    this.actionError.set('');
  }

  esYo(user: Usuario): boolean {
    return this.auth.usuario()?.id === user.id;
  }

  rolLabel(rol: Rol): string {
    return this.roles.find((r) => r.value === rol)?.label ?? rol;
  }

  fieldError(field: 'nombre' | 'usuario' | 'clave'): string {
    const control = this.form.controls[field];
    if (!control.touched || !control.errors) return '';
    if (control.errors['server']) return String(control.errors['server']);
    if (control.errors['required']) return 'Este campo es obligatorio.';
    if (control.errors['pattern']) return 'Usa 3 a 30 letras, números, punto, guion o guion bajo.';
    if (control.errors['minlength']) return 'La contraseña debe tener al menos 8 caracteres.';
    return 'Revisa este campo.';
  }

  guardar(): void {
    if (this.busy()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.actionError.set('Revisa los campos señalados antes de guardar.');
      return;
    }
    const v = this.form.getRawValue();
    const editing = this.editing();
    let request;
    if (editing) {
      const cambios: UsuarioActualizar = { nombre: v.nombre.trim(), rol: v.rol, activo: v.activo };
      if (v.clave) cambios.clave = v.clave;
      request = this.api.update(editing.id, cambios);
    } else {
      request = this.api.create({
        nombre: v.nombre.trim(),
        usuario: v.usuario.trim().toLowerCase(),
        clave: v.clave,
        rol: v.rol,
      });
    }
    this.saving.set(true);
    this.actionError.set('');
    this.success.set('');
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (user) => {
        this.saving.set(false);
        this.showForm.set(false);
        this.success.set(`Usuario ${user.usuario} ${editing ? 'actualizado' : 'creado'} correctamente.`);
        this.load();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.actionError.set(this.errorMessage(error));
      },
    });
  }

  private errorMessage(error: HttpErrorResponse): string {
    if (typeof error.error?.detail === 'string' && [403, 404, 409].includes(error.status))
      return error.error.detail;
    if (error.status === 422) return 'Revisa los datos: hay campos que no cumplen las validaciones.';
    return 'No se pudo conectar con el servicio. Comprueba la conexión e intenta de nuevo.';
  }
}
