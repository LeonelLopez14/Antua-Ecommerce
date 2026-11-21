import { layout, paragraph, TEXT_FOOTER, type RenderedMail } from './layout';

/** Recuperación de contraseña. El enlace es de un solo uso y vence; nunca se manda la contraseña. */
export function passwordResetMail(link: string, minutes: number): RenderedMail {
  const lines = [
    'Recibimos un pedido para restablecer tu contraseña.',
    `El enlace vence en ${minutes} minutos y sirve una sola vez.`,
    'Si no fuiste vos, ignorá este correo: tu contraseña no cambia.',
  ];
  return {
    subject: 'Restablecé tu contraseña de Antojarte',
    html: layout({
      title: 'Restablecé tu contraseña',
      preheader: `El enlace vence en ${minutes} minutos.`,
      body: lines.map(paragraph).join('\n'),
      action: { label: 'Crear una contraseña nueva', url: link },
    }),
    text: [
      'Restablecé tu contraseña',
      '',
      lines[0],
      `Entrá a este enlace (${lines[1].toLowerCase()}):`,
      link,
      lines[2],
      '',
      TEXT_FOOTER,
    ].join('\n'),
  };
}
