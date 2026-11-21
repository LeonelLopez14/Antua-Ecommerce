import { Logger } from '@nestjs/common';
import { MailService } from './mail.service';
import type { MailMessage, MailTransport } from './mail.types';

/** Transporte falso: falla las primeras `failures` veces, como un proveedor caído. */
function fakeTransport(failures: number) {
  const sent: MailMessage[] = [];
  let calls = 0;
  const transport: MailTransport = {
    send: (message) => {
      calls++;
      if (calls <= failures) {
        return Promise.reject(
          Object.assign(new Error(`550 <${message.to}>: usuario desconocido`), {
            code: 'EENVELOPE',
            responseCode: 550,
          }),
        );
      }
      sent.push(message);
      return Promise.resolve();
    },
  };
  return { transport, sent, calls: () => calls };
}

describe('MailService', () => {
  let errors: string[];

  beforeEach(() => {
    errors = [];
    jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation((message: unknown) => {
        errors.push(String(message));
      });
  });
  afterEach(() => jest.restoreAllMocks());

  it('manda el correo con texto y HTML', async () => {
    const fake = fakeTransport(0);
    const service = new MailService(fake.transport, 0);
    await expect(
      service.sendPasswordReset(
        'ana@antojarte.example',
        'https://a.test/x?token=abc',
        60,
      ),
    ).resolves.toBe(true);
    expect(fake.sent[0]).toMatchObject({
      to: 'ana@antojarte.example',
      subject: 'Restablecé tu contraseña de Antojarte',
    });
    expect(fake.sent[0].text).toContain('https://a.test/x?token=abc');
    expect(fake.sent[0].html).toContain('https://a.test/x?token=abc');
  });

  it('reintenta una vez si el primer intento falla', async () => {
    const fake = fakeTransport(1);
    const service = new MailService(fake.transport, 0);
    await expect(
      service.sendPasswordReset(
        'ana@antojarte.example',
        'https://a.test/x',
        60,
      ),
    ).resolves.toBe(true);
    expect(fake.calls()).toBe(2);
    expect(errors).toEqual([]);
  });

  it('si falla dos veces no rechaza, y el log no tiene la dirección ni el cuerpo', async () => {
    const fake = fakeTransport(2);
    const service = new MailService(fake.transport, 0);
    await expect(
      service.sendPasswordReset(
        'ana@antojarte.example',
        'https://a.test/x?token=secreto',
        60,
      ),
    ).resolves.toBe(false);
    expect(fake.calls()).toBe(2);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('EENVELOPE 550');
    expect(errors[0]).not.toContain('ana@');
    expect(errors[0]).not.toContain('token');
  });

  it('un error al armar la plantilla tampoco rechaza', async () => {
    const fake = fakeTransport(0);
    const service = new MailService(fake.transport, 0);
    await expect(
      service.sendPasswordReset(
        'ana@antojarte.example',
        'javascript:alert(1)',
        60,
      ),
    ).resolves.toBe(false);
    expect(fake.calls()).toBe(0);
    expect(errors[0]).toContain('No se pudo armar');
  });
});
