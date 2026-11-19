import { APIRequestContext, expect, Page, test } from '@playwright/test';

// Credenciales de prueba (se pueden cambiar con variables de entorno).
const ADMIN = { usuario: process.env.E2E_ADMIN_USER ?? 'admin', clave: process.env.E2E_ADMIN_PASS ?? '' };
const OPERADOR = { usuario: process.env.E2E_OP_USER ?? 'operador', clave: process.env.E2E_OP_PASS ?? '' };

async function token(request: APIRequestContext, cred: { usuario: string; clave: string }): Promise<string> {
  const r = await request.post('/auth/login', { data: cred });
  expect(r.ok(), 'inicio de sesión por API').toBeTruthy();
  return (await r.json()).token;
}

async function crearVehiculo(request: APIRequestContext, tipo = 'AUTOMOVIL'): Promise<string> {
  const letras = Math.random().toString(36).replace(/[^a-z]/g, 'x').slice(2, 4).toUpperCase().padEnd(2, 'X');
  const placa = `T${letras}${Math.floor(100 + Math.random() * 900)}`;
  const t = await token(request, OPERADOR);
  const r = await request.post('/vehiculos', {
    headers: { Authorization: `Bearer ${t}` },
    data: { placa, color: 'Rojo', modelo: 2022, marca: 'Mazda', tipo },
  });
  expect(r.status(), 'crear vehículo de prueba').toBe(201);
  return placa;
}

async function entrar(page: Page, cred: { usuario: string; clave: string }) {
  await page.goto('/');
  await page.getByLabel('Usuario').fill(cred.usuario);
  await page.getByLabel('Contraseña').fill(cred.clave);
  const [login] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/auth/login')),
    page.getByRole('button', { name: 'Ingresar' }).click(),
  ]);
  expect(login.ok(), 'inicio de sesión en la pantalla').toBeTruthy();
  await page.waitForFunction(() => !!sessionStorage.getItem('ac_token'));
  await page.goto('/gestion/pagos');
  await expect(page.getByRole('heading', { name: 'Pagos', exact: true })).toBeVisible();
}

function guardarMoto(page: Page) {
  return page.locator('.field', { has: page.locator('#tarifa-MOTO') }).getByRole('button', { name: 'Guardar' });
}

function reporte(page: Page) {
  return page.getByRole('region', { name: /Reporte de pagos/ });
}

async function consultar(page: Page, placa: string) {
  await page.getByLabel('Placa del vehículo').fill(placa);
  await page.getByRole('button', { name: 'Consultar estado' }).click();
}

test.describe('Gestión de pagos', () => {
  test('PP-01 El administrador cambia la tarifa de un tipo', async ({ page }) => {
    await entrar(page, ADMIN);
    const campo = page.locator('#tarifa-MOTO');
    const actual = Number(await campo.inputValue());
    await campo.fill(String(actual + 1000));
    await guardarMoto(page).click();
    await expect(page.getByRole('status').filter({ hasText: 'Tarifa de MOTO actualizada' })).toBeVisible();
    await campo.fill(String(actual)); // restaura el valor original
    await guardarMoto(page).click();
  });

  test('PP-02 Rechaza una tarifa en cero', async ({ page }) => {
    await entrar(page, ADMIN);
    await page.locator('#tarifa-MOTO').fill('0');
    await guardarMoto(page).click();
    await expect(page.getByRole('alert')).toContainText('mayor que cero');
  });

  test('PP-03 y PP-17 El operador no ve tarifas ni reporte, y la API responde 403', async ({ page, request }) => {
    await entrar(page, OPERADOR);
    await expect(page.getByText('Tarifa mensual por tipo de vehículo')).toHaveCount(0);
    await expect(page.getByText('Reporte de pagos')).toHaveCount(0);
    const t = await token(request, OPERADOR);
    const h = { Authorization: `Bearer ${t}` };
    expect((await request.put('/pagos/tarifas/MOTO', { headers: h, data: { valor: 90000 } })).status()).toBe(403);
    expect((await request.get('/pagos', { headers: h })).status()).toBe(403);
  });

  test('PP-04 Consulta un vehículo sin pagos', async ({ page, request }) => {
    const placa = await crearVehiculo(request);
    await entrar(page, OPERADOR);
    await consultar(page, placa);
    await expect(page.getByText('Sin pagos').first()).toBeVisible();
  });

  test('PP-05 Consulta una placa no registrada', async ({ page }) => {
    await entrar(page, OPERADOR);
    await consultar(page, 'ZZZ999');
    await expect(page.getByRole('alert')).toContainText('no encontrado');
  });

  test('PP-06, PP-12 y PP-13 Registra el primer pago, muestra el comprobante y marca ✔', async ({ page, request }) => {
    const placa = await crearVehiculo(request);
    await entrar(page, OPERADOR);
    await consultar(page, placa);
    await page.getByRole('button', { name: /Registrar pago de/ }).click();
    await expect(page.getByRole('status').filter({ hasText: `Pago registrado para ${placa}` })).toBeVisible();
    await expect(page.getByLabel('Comprobante de pago')).toContainText(placa);
    await expect(page.getByRole('button', { name: 'Imprimir comprobante' })).toBeVisible();
    await page.getByRole('button', { name: 'Actualizar' }).click();
    const fila = page.getByRole('row').filter({ hasText: placa });
    await expect(fila).toContainText('Pagado');
    await expect(fila).toContainText('30 días');
  });

  test('PP-07 Con la mensualidad vigente, el nuevo mes se suma al vencimiento', async ({ request }) => {
    const placa = await crearVehiculo(request);
    const t = await token(request, OPERADOR);
    const h = { Authorization: `Bearer ${t}` };
    const p1 = await (await request.post('/pagos', { headers: h, data: { placa } })).json();
    const p2 = await (await request.post('/pagos', { headers: h, data: { placa } })).json();
    expect(p2.desde).toBe(p1.hasta);
  });

  test('PP-10 Dos cobros simultáneos no repiten el periodo', async ({ request }) => {
    const placa = await crearVehiculo(request);
    const t = await token(request, OPERADOR);
    const h = { Authorization: `Bearer ${t}` };
    const [a, b] = await Promise.all([
      request.post('/pagos', { headers: h, data: { placa } }),
      request.post('/pagos', { headers: h, data: { placa } }),
    ]);
    const [pa, pb] = [await a.json(), await b.json()];
    expect(pa.desde).not.toBe(pb.desde);
  });

  test('PP-11 Cobrar sin sesión responde 401', async ({ request }) => {
    const r = await request.post('/pagos', { data: { placa: 'ZZZ999' } });
    expect(r.status()).toBe(401);
  });

  test('PP-16 El reporte filtra por placa y suma el recaudado', async ({ page, request }) => {
    const placa = await crearVehiculo(request);
    const t = await token(request, OPERADOR);
    await request.post('/pagos', { headers: { Authorization: `Bearer ${t}` }, data: { placa } });
    await entrar(page, ADMIN);
    await page.locator('#f-placa').fill(placa);
    await page.getByRole('button', { name: 'Filtrar' }).click();
    await expect(reporte(page).getByRole('row').filter({ hasText: placa })).toHaveCount(1);
    await expect(page.getByText('Total recaudado')).toBeVisible();
  });

  test('PP-18, PP-19 y PP-20 Anula con motivo, exige el motivo y no anula dos veces', async ({ page, request }) => {
    const placa = await crearVehiculo(request);
    const t = await token(request, OPERADOR);
    await request.post('/pagos', { headers: { Authorization: `Bearer ${t}` }, data: { placa } });
    await entrar(page, ADMIN);
    await page.locator('#f-placa').fill(placa);
    await page.getByRole('button', { name: 'Filtrar' }).click();
    const fila = reporte(page).getByRole('row').filter({ hasText: placa });
    await fila.getByRole('button', { name: 'Anular' }).click();
    // PP-19: sin motivo no anula
    await page.getByRole('button', { name: 'Confirmar anulación' }).click();
    await expect(page.getByText('El motivo es obligatorio.')).toBeVisible();
    // PP-18: con motivo anula
    await page.getByLabel('Motivo de la anulación').fill('Cobro duplicado por error');
    await page.getByRole('button', { name: 'Confirmar anulación' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'anulado' })).toBeVisible();
    await expect(fila).toContainText('Anulado');
    // PP-20: no se puede anular otra vez (API)
    const ta = await token(request, ADMIN);
    const lista = await (await request.get(`/pagos?placa=${placa}`, { headers: { Authorization: `Bearer ${ta}` } })).json();
    const r = await request.post(`/pagos/${lista.items[0].id}/anular`, {
      headers: { Authorization: `Bearer ${ta}` }, data: { motivo: 'Otra vez' } });
    expect(r.status()).toBe(409);
  });
});
