import { LogMailTransport } from './log-mail.transport';

describe('LogMailTransport (desarrollo)', () => {
  const env = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = env;
  });

  it('muestra los enlaces completos (con token) para seguir el flujo, sin el cuerpo', async () => {
    const printed: string[] = [];
    const transport = new LogMailTransport((text) => printed.push(text));
    await transport.send({
      to: 'ana@antojarte.example',
      subject: 'Restablecé tu contraseña',
      text: 'Hola Ana, Calle 1. Entrá a https://localhost:5173/restablecer-contrasena?token=abc123XYZ',
      html: '<p>Hola</p>',
    });
    expect(printed).toEqual([
      '  enlaces del correo: https://localhost:5173/restablecer-contrasena?token=abc123XYZ',
    ]);
    expect(printed.join()).not.toContain('Calle 1');
  });

  it('en producción se niega a "enviar"', async () => {
    process.env.NODE_ENV = 'production';
    const transport = new LogMailTransport(() => undefined);
    await expect(
      transport.send({ to: 'a@b.example', subject: 's', text: 't', html: 'h' }),
    ).rejects.toThrow('no envía correos en producción');
  });
});
