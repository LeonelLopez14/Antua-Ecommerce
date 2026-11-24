/**
 * Revisa la configuración de Mercado Pago sin conectarse a ningún servicio externo.
 *
 *   pnpm payments:check
 *
 * Lee antua-api/.env (las variables ya definidas en el entorno tienen prioridad), imprime qué
 * está bien, qué falta y la URL del webhook para cargar en Mercado Pago. Sale con código 1 si
 * falta algo para el modo Mercado Pago. Nunca muestra secretos completos.
 * Paso a paso: antua-web/docs/mercadopago-prueba.md.
 */
import { join } from 'node:path';
import { checkPaymentsEnv } from '../src/config/payments-check';

try {
  process.loadEnvFile(join(process.cwd(), '.env'));
} catch {
  // Sin .env: se usan las variables del entorno.
}

const ICON = { ok: '✓', aviso: '!', falta: '✗' } as const;
const { lines, ready } = checkPaymentsEnv(process.env);

process.stdout.write('Configuración de Mercado Pago (sin conectarse):\n');
for (const line of lines)
  process.stdout.write(`  ${ICON[line.level]} ${line.text}\n`);
process.stdout.write(
  ready
    ? '\nListo para probar con Mercado Pago (modo prueba). Seguí docs/mercadopago-prueba.md.\n'
    : '\nTodavía falta algo para probar con Mercado Pago (los ✗ de arriba).\n',
);
process.exitCode = ready ? 0 : 1;
