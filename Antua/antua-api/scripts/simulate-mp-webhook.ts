/**
 * Envía a la API un webhook firmado, como lo haría Mercado Pago. Solo funciona contra
 * una API levantada con PAYMENTS_SIMULATED=true. No sale a internet.
 *
 *   pnpm payments:simulate <idPedido> <approved|pending|rejected|refunded|mismatch> [urlApi]
 */
import { createHmac, randomUUID } from 'node:crypto';
import {
  simulatedPaymentId,
  SIMULATED_STATUSES,
  SimulatedStatus,
} from '../src/payments/simulated.provider';

try {
  process.loadEnvFile('.env');
} catch {
  // Sin .env: se usan las variables del entorno.
}

const isStatus = (value: string): value is SimulatedStatus =>
  value in SIMULATED_STATUSES;

async function main() {
  const [orderArg, status = '', apiUrl = 'http://localhost:3000'] =
    process.argv.slice(2);
  const secret = process.env.MP_WEBHOOK_SECRET;
  const orderId = Number(orderArg);

  if (!Number.isInteger(orderId) || !isStatus(status) || !secret) {
    throw new Error(
      'Uso: pnpm payments:simulate <idPedido> <approved|pending|rejected|refunded|mismatch> [urlApi]. Requiere MP_WEBHOOK_SECRET.',
    );
  }

  const dataId = simulatedPaymentId(orderId, status);
  const requestId = randomUUID();
  const ts = Math.floor(Date.now() / 1000);
  const v1 = createHmac('sha256', secret)
    .update(`id:${dataId};request-id:${requestId};ts:${ts};`)
    .digest('hex');

  const response = await fetch(
    `${apiUrl}/payments/webhook?data.id=${dataId}&type=payment`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': `ts=${ts},v1=${v1}`,
        'x-request-id': requestId,
      },
      body: JSON.stringify({
        type: 'payment',
        action: 'payment.updated',
        data: { id: dataId },
      }),
    },
  );
  process.stdout.write(`${response.status} ${await response.text()}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${String(error)}\n`);
  process.exitCode = 1;
});
