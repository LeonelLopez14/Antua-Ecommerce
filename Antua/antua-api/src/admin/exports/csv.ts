import {
  storeDate,
  storeOffsetMinutes,
  mysqlOffset,
} from 'src/common/store-time';

/**
 * CSV para Excel y planillas. Reglas:
 * - UTF-8 con BOM: sin el BOM, Excel abre los acentos rotos.
 * - Separador `;` por defecto: Excel con configuración regional de Uruguay usa `;` como separador
 *   de listas (porque la coma es el separador decimal). `,` con ?separator=comma.
 * - Comillas (RFC 4180): un campo con separador, comillas o saltos de línea va entre comillas, y
 *   las comillas internas se duplican.
 * - Inyección de fórmulas: un texto que empieza con = + - @, tab o retorno de carro, Excel lo
 *   ejecuta como fórmula (por ejemplo, un nombre "=HYPERLINK(…)"). Se le antepone un apóstrofo,
 *   que Excel muestra como texto. Solo en campos de texto: los montos son números.
 */
export type Separator = ';' | ',';

export const BOM = String.fromCharCode(0xfeff);

const FORMULA_START = /^[=+\-@\t\r]/;

/** Un campo de texto (dato que pudo escribir alguien): protegido contra fórmulas. */
export function textCell(
  value: string | null | undefined,
  separator: Separator,
): string {
  const text = value ?? '';
  const safe = FORMULA_START.test(text) ? `'${text}` : text;
  return quote(safe, separator);
}

/** Un número sin formato localizado: punto decimal, sin separador de miles (1500.5 → "1500.50"). */
export function numberCell(
  value: number | string | null | undefined,
  decimals = 2,
): string {
  if (value === null || value === undefined || value === '') return '';
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return decimals === 0 ? String(Math.trunc(number)) : number.toFixed(decimals);
}

/** Booleano como "sí"/"no". */
export const boolCell = (value: boolean | number | null | undefined): string =>
  value ? 'sí' : 'no';

function quote(text: string, separator: Separator): string {
  return text.includes(separator) || /["\r\n]/.test(text)
    ? `"${text.replaceAll('"', '""')}"`
    : text;
}

/** Una fila: los campos ya vienen escapados. Fin de línea CRLF (el de RFC 4180 y Excel). */
export const row = (cells: string[], separator: Separator): string =>
  `${cells.join(separator)}\r\n`;

/**
 * Instante en ISO 8601 con la hora de Montevideo: "2026-11-20T12:30:05-03:00".
 * Así se lee la hora de la tienda y, al mismo tiempo, el instante exacto no es ambiguo.
 */
export function storeIso(instant: Date | string | null | undefined): string {
  if (!instant) return '';
  const date = instant instanceof Date ? instant : new Date(instant);
  if (Number.isNaN(date.getTime())) return '';
  const offset = storeOffsetMinutes(date);
  const local = new Date(date.getTime() + offset * 60_000);
  const time = local.toISOString().slice(11, 19);
  return `${storeDate(date)}T${time}${mysqlOffset(offset)}`;
}
