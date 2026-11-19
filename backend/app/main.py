from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.routers.vehiculos import router as vehiculos_router
from app.services.vehiculo import VehiculoError
from app.routers.celdas import router as celdas_router
from app.services.celda import CeldaError
from app.routers.operadores import router as operadores_router
from app.services.operador import OperadorError
from app.routers.estancias import router as estancias_router
from app.services.estancia import EstanciaError
from app.routers.auth import router as auth_router
from app.routers.usuarios import router as usuarios_router
from app.routers.pagos import router as pagos_router
from app.routers.sistema import router as sistema_router
from app.services.usuario import UsuarioError
from app.services.pago import PagoError
from app.routers.novedades import router as novedades_router
from app.routers.reportes import router as reportes_router
from app.services.novedad import NovedadError
from app.services.reporte import ReporteError
from app.services.bitacora import registrar_error

app = FastAPI(title="Autos Colombia API")
app.include_router(vehiculos_router)
app.include_router(celdas_router)
app.include_router(operadores_router)
app.include_router(estancias_router)
app.include_router(auth_router)
app.include_router(usuarios_router)
app.include_router(pagos_router)
app.include_router(sistema_router)
app.include_router(novedades_router)
app.include_router(reportes_router)


@app.exception_handler(VehiculoError)
@app.exception_handler(CeldaError)
@app.exception_handler(OperadorError)
@app.exception_handler(EstanciaError)
@app.exception_handler(UsuarioError)
@app.exception_handler(PagoError)
@app.exception_handler(NovedadError)
@app.exception_handler(ReporteError)
async def entity_error_handler(request, error: VehiculoError | CeldaError | OperadorError | EstanciaError | UsuarioError | PagoError | NovedadError | ReporteError) -> JSONResponse:
    if error.status_code >= 500:
        registrar_error(request.method, request.url.path, error.status_code, f"{type(error).__name__}: {error.detail}")
    return JSONResponse(status_code=error.status_code, content={"detail": error.detail})


@app.exception_handler(Exception)
async def unexpected_error_handler(request: Request, error: Exception) -> JSONResponse:
    # Solo el tipo de excepción: el texto puede contener datos de la consulta.
    registrar_error(request.method, request.url.path, 500, f"{type(error).__name__}: error no controlado")
    return JSONResponse(status_code=500, content={"detail": "Error interno del servidor."})


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
