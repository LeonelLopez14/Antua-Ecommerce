import { DataSource } from 'typeorm';
import { join } from 'node:path';

// El CLI de TypeORM no pasa por Nest: lee el .env directamente.
// Una variable ya definida en el entorno tiene prioridad sobre el archivo.
try {
  process.loadEnvFile(join(process.cwd(), '.env'));
} catch {
  // Sin .env (por ejemplo en CI): se usan las variables del entorno.
}

/** Configuración que usa `pnpm migration:*`. La app usa la misma ruta de migraciones. */
export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  timezone: 'Z',
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
});
