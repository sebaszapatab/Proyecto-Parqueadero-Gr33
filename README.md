# Autos Colombia

Sistema web para administrar un parqueadero de **mensualidades**: entradas y salidas de
vehículos, asignación de celdas libres (90 para carros y 10 para motos), usuarios con roles
y cobro de mensualidades.

**Tecnologías:** FastAPI + SQLAlchemy + Alembic (backend), Angular (frontend) y PostgreSQL.

---

## Guía rápida para probar el sistema

### 1. Requisitos

| Programa | Versión recomendada |
| --- | --- |
| Python | 3.13 |
| Node.js | 22 o superior |
| PostgreSQL | 16 o superior |
| Git | cualquiera |

Todos los comandos son para **PowerShell** en Windows.

### 2. Descargar el proyecto

```powershell
git clone https://github.com/sebaszapatab/Proyecto-Parqueadero-Gr33.git
cd Proyecto-Parqueadero-Gr33
```

### 3. Crear la base de datos

Cambia la ruta si tu PostgreSQL está en otra versión. Pedirá la contraseña de `postgres`.

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h 127.0.0.1 -c "CREATE DATABASE autos_colombia;"
```

### 4. Backend (terminal 1)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
notepad .env
```

En el Bloc de notas deja estos valores (cambia **solo** `DB_PASSWORD` por la contraseña de tu
usuario `postgres`) y guarda:

```
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=autos_colombia
DB_USER=postgres
DB_PASSWORD=tu_contraseña_de_postgres
DB_CONNECT_TIMEOUT=5
```

Crea las tablas, carga los datos de ejemplo e inicia el servidor:

```powershell
alembic upgrade head
python preparar_demo.py
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

> Si PowerShell bloquea el entorno virtual, ejecuta antes
> `Set-ExecutionPolicy -Scope Process Bypass` y vuelve a activarlo.

### 5. Frontend (terminal 2)

```powershell
cd frontend
npm install
npm start
```

Abre <http://127.0.0.1:4200>.

### 6. Usuarios de demostración

Los crea `preparar_demo.py` en tu base de datos local.

| Rol | Usuario | Contraseña |
| --- | --- | --- |
| Administrador | `profesor` | `administradorprofesor` |
| Operador | `operador` | `operadorprofesor` |
| Desarrollador | `desarrollador` | `desarrolladorprofesor` |

Son claves de demostración para una base local; no se usan en ningún servicio real.

---

## Roles y permisos

| Rol | Qué puede hacer |
| --- | --- |
| **Operador** | Registrar entradas y salidas, asignar celdas libres, ver la disponibilidad, registrar vehículos y recibir pagos. |
| **Administrador** | Gestionar usuarios, operadores y celdas; editar y eliminar vehículos; en pagos, tarifas, reporte y anulación con motivo (también puede cobrar). Ve la disponibilidad solo para consulta. |
| **Desarrollador** | Solo la pantalla **Sistema**: estado técnico (API, base de datos, versión de migración y conteos generales). |

Los permisos se validan en el servidor, no solo en el menú.

## Recorrido sugerido

1. Entra como **operador** → *Control de acceso*. Escribe la placa `ABC123` y sal del campo:
   se ofrecen solo celdas libres del tipo del vehículo. Elige celda y operador, y registra la entrada.
2. Abre *Disponibilidad*: la celda aparece ocupada con la placa.
3. Entra como **profesor** (administrador) → *Pagos*: consulta `ABC123`, registra el pago
   (extiende el vencimiento un mes) y revisa el comprobante y el reporte.
4. Vuelve como operador y registra otra entrada con un vehículo sin pago: aparece un aviso
   amarillo de mensualidad vencida, pero **no se bloquea** el ingreso.
5. Entra como **desarrollador** → *Sistema*.

## Reglas del negocio

- Un vehículo no tiene celda fija: el operador elige entre las celdas libres de su tipo.
- La mensualidad depende del tipo de vehículo (tarifas editables por el administrador).
- Cada pago extiende el vencimiento un mes. Si el pago está vigente, el nuevo mes se suma al vencimiento.
- Una mensualidad vencida solo genera una advertencia; no impide la entrada.
- Un pago anulado exige un motivo y deja de contar para el vencimiento.
- Las sesiones expiran tras 30 minutos sin actividad.

## Estructura

```
backend/    API (FastAPI): routers, services, schemas, modelos y migraciones (Alembic)
frontend/   Aplicación Angular: pantallas, servicios y guardas por rol
docs/       Detalle técnico de cada etapa del desarrollo
```

La documentación interactiva de la API está en <http://127.0.0.1:8000/docs> con el backend iniciado.

## Pruebas (opcional)

```powershell
cd backend
pytest -q
cd ..\frontend
npm test -- --watch=false
```

## Problemas frecuentes

| Síntoma | Solución |
| --- | --- |
| `alembic` o `uvicorn` no se reconocen | Activa el entorno: `.\.venv\Scripts\Activate.ps1` |
| `Completa en backend/.env: ...` | Falta llenar `backend/.env` (paso 4). |
| Error de conexión a la base de datos | Comprueba que PostgreSQL esté iniciado y que `DB_PASSWORD` sea correcta. |
| El puerto 8000 o 4200 está ocupado | Cierra la ventana que lo usa (Ctrl+C) y vuelve a iniciar. |
| La página queda cargando o sin datos | Verifica que el backend (puerto 8000) esté corriendo. |
