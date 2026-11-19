import { defineConfig } from '@playwright/test';

// Requiere el backend (puerto 8000) y el frontend (npm start, puerto 4200) en marcha.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:4200', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
});
