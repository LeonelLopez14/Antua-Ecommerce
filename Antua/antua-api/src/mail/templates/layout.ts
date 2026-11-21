import { STORE_TIME_ZONE } from 'src/common/store-time';

/** Lo que devuelve cada plantilla: el MailService lo manda tal cual. */
export interface RenderedMail {
  subject: string;
  /** Versión de texto plano: la leen los clientes que no muestran HTML (y los filtros de spam la valoran). */
  text: string;
  html: string;
}

/**
 * Escapa texto para meterlo en HTML. TODO dato que viene de un usuario (nombre, dirección,
 * nombre de producto) pasa por acá: un nombre como `<script>` se ve como texto, no se ejecuta.
 */
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Solo enlaces http(s): un `javascript:` en un correo no tiene que poder colarse nunca. */
export function safeUrl(url: string): string {
  const parsed = URL.canParse(url) ? new URL(url) : null;
  if (!parsed || !['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Enlace de correo inválido.');
  }
  return parsed.toString();
}

const money = new Intl.NumberFormat('es-UY', {
  style: 'currency',
  currency: 'UYU',
});

/** Montos en pesos uruguayos (la moneda única del sitio). */
export const formatMoney = (amount: number): string => money.format(amount);

const dateTime = new Intl.DateTimeFormat('es-UY', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: STORE_TIME_ZONE,
});

/** Fecha y hora de Montevideo, como la ve quien compra. */
export const formatDateTime = (date: Date): string => dateTime.format(date);

/** Colores de DESIGN.md §2. Sin imágenes remotas ni píxeles de seguimiento. */
const COLORS = {
  bg: '#FFFBE9',
  surface: '#F7F5FF',
  text: '#2E2D2C',
  accent: '#8D572E',
  accentText: '#FFFBE9',
  darkBg: '#151515',
  darkSurface: '#1E1D1C',
  darkText: '#F5F2E8',
  darkSecondary: '#CFC8BC',
  darkAccent: '#D7A46A',
};

interface LayoutParams {
  /** Título visible (texto plano: se escapa acá). */
  title: string;
  /** Texto oculto que muchos clientes muestran como vista previa en la bandeja. */
  preheader: string;
  /** HTML del cuerpo. Quien lo arma escapa los datos con escapeHtml. */
  body: string;
  /** Botón principal opcional. */
  action?: { label: string; url: string };
}

/**
 * Estructura común de los correos: tablas e estilos en línea (lo que mejor soportan los clientes
 * de correo), modo claro por defecto y modo oscuro con prefers-color-scheme donde se soporta.
 */
export function layout({
  title,
  preheader,
  body,
  action,
}: LayoutParams): string {
  const button = action
    ? `<p style="margin:28px 0 8px"><a class="btn" href="${escapeHtml(safeUrl(action.url))}" style="display:inline-block;background:${COLORS.accent};color:${COLORS.accentText};text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:999px">${escapeHtml(action.label)}</a></p>`
    : '';
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(title)}</title>
<style>
  @media (prefers-color-scheme: dark) {
    .page { background: ${COLORS.darkBg} !important; }
    .card { background: ${COLORS.darkSurface} !important; color: ${COLORS.darkText} !important; }
    .muted { color: ${COLORS.darkSecondary} !important; }
    .brand, .accent { color: ${COLORS.darkAccent} !important; }
    .btn { background: ${COLORS.darkAccent} !important; color: ${COLORS.darkBg} !important; }
    .line { border-color: #3A3835 !important; }
  }
</style>
</head>
<body class="page" style="margin:0;padding:0;background:${COLORS.bg}">
<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="page" style="background:${COLORS.bg}">
<tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="card" style="max-width:560px;background:${COLORS.surface};color:${COLORS.text};border-radius:20px;font-family:Lato,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5">
<tr><td style="padding:28px 28px 8px">
<p class="brand" translate="no" style="margin:0;font-family:'Playfair Display',Georgia,serif;font-size:24px;font-weight:bold;color:${COLORS.accent}">Antojarte</p>
</td></tr>
<tr><td style="padding:8px 28px 28px">
<h1 style="margin:0 0 12px;font-family:'Playfair Display',Georgia,serif;font-size:24px;line-height:1.25">${escapeHtml(title)}</h1>
${body}
${button}
<p class="muted" style="margin:28px 0 0;font-size:13px;color:#5A5855">Antojarte es una marca ficticia creada para un proyecto de práctica. Si no esperabas este correo, podés ignorarlo.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/** Párrafo con texto escapado. */
export const paragraph = (text: string): string =>
  `<p style="margin:0 0 12px">${escapeHtml(text)}</p>`;

/** Pie de texto plano común. */
export const TEXT_FOOTER =
  '—\nAntojarte es una marca ficticia creada para un proyecto de práctica. Si no esperabas este correo, podés ignorarlo.';
