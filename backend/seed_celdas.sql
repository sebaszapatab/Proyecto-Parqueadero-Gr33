-- Crea las 100 celdas del parqueadero: 90 para carros y 10 para motos.
-- Se puede ejecutar varias veces sin duplicar celdas.

-- Si existe la celda de prueba A-01, se convierte en la primera celda de carros.
UPDATE celda SET codigo = 'C-01', tipo = 'AUTOMOVIL'
WHERE codigo = 'A-01' AND NOT EXISTS (SELECT 1 FROM celda WHERE codigo = 'C-01');

INSERT INTO celda (codigo, tipo)
SELECT 'C-' || lpad(n::text, 2, '0'), 'AUTOMOVIL' FROM generate_series(1, 90) AS n
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO celda (codigo, tipo)
SELECT 'M-' || lpad(n::text, 2, '0'), 'MOTO' FROM generate_series(1, 10) AS n
ON CONFLICT (codigo) DO NOTHING;

SELECT tipo, count(*) AS celdas FROM celda GROUP BY tipo ORDER BY tipo;
