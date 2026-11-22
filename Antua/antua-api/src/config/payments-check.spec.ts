import { checkPaymentsEnv } from './payments-check';

const complete = {
  MP_ACCESS_TOKEN:
    'APP_USR-prueba-de-ejemplo-sin-valor-real-para-tests',
  MP_WEBHOOK_SECRET: 'f'.repeat(64),
  MP_PUBLIC_API_URL: 'https://api-tunel.ejemplo.test/',
  MP_PUBLIC_FRONTEND_URL: 'https://tienda-tunel.ejemplo.test',
};

describe('payments:check', () => {
  it('sin variables: pagos deshabilitados y avisa qué falta', () => {
    const { lines, ready } = checkPaymentsEnv({});
    expect(ready).toBe(false);
    const text = lines.map((line) => line.text).join('\n');
    expect(text).toContain('Pagos deshabilitados');
    expect(text).toContain('MP_ACCESS_TOKEN: vacío');
    expect(text).toContain('MP_PUBLIC_API_URL vacía');
  });

  it('completa: lista para probar y muestra la URL del webhook', () => {
    const { lines, ready } = checkPaymentsEnv(complete);
    expect(ready).toBe(true);
    expect(lines.map((line) => line.text).join('\n')).toContain(
      'https://api-tunel.ejemplo.test/payments/webhook',
    );
  });

  it('nunca imprime el token ni el secreto completos', () => {
    const text = checkPaymentsEnv(complete)
      .lines.map((line) => line.text)
      .join('\n');
    expect(text).not.toContain(complete.MP_ACCESS_TOKEN);
    expect(text).not.toContain(complete.MP_WEBHOOK_SECRET);
  });

  it('marca URLs locales o sin HTTPS', () => {
    const { lines, ready } = checkPaymentsEnv({
      ...complete,
      MP_PUBLIC_API_URL: 'http://localhost:3000',
    });
    expect(ready).toBe(false);
    expect(lines.some((line) => line.level === 'falta')).toBe(true);
  });

  it('simulado + credenciales a la vez es un error', () => {
    const { ready, lines } = checkPaymentsEnv({
      ...complete,
      PAYMENTS_SIMULATED: 'true',
    });
    expect(ready).toBe(false);
    expect(lines.map((line) => line.text).join('\n')).toContain('elegí uno');
  });

  it('un token con formato raro avisa sin bloquear', () => {
    const { lines } = checkPaymentsEnv({ ...complete, MP_ACCESS_TOKEN: 'abc' });
    expect(lines.some((line) => line.text.includes('formato esperado'))).toBe(
      true,
    );
  });
});
