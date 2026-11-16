import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Los e2e corren contra una base propia. Estas variables tienen prioridad sobre el .env.
process.env.NODE_ENV = 'test';
process.env.DB_DATABASE = 'antua_test';
process.env.SHIPPING_FLAT_RATE = '1500';
process.env.SHIPPING_ETA_DAYS = '3';
process.env.PAYMENTS_SIMULATED = 'true';
process.env.MP_WEBHOOK_SECRET = 'secreto-de-prueba-para-los-e2e';
process.env.UPLOADS_DIR = join(tmpdir(), 'antua-e2e-uploads');
process.env.LOW_STOCK_THRESHOLD = '5';
process.env.CORS_ORIGINS = 'https://tienda.ejemplo.test';
