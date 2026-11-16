/** Formatos aceptados y su "firma" (los primeros bytes del archivo). */
export type ImageKind = 'jpg' | 'png' | 'webp';

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/**
 * Tipo real de la imagen según su contenido. No se confía en la extensión ni en el
 * Content-Type: los manda el navegador y se pueden falsificar (por ejemplo, un HTML
 * renombrado a .png). Devuelve null si no es JPEG, PNG ni WebP.
 */
export function detectImageKind(buffer: Buffer): ImageKind | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'jpg';
  }
  const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buffer.length >= 8 && PNG.every((byte, i) => buffer[i] === byte)) {
    return 'png';
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

/** Nombres que genera el servidor: 32 caracteres hex y la extensión del tipo detectado. */
export const UPLOADED_FILE_NAME = /^[a-f0-9]{32}\.(jpg|png|webp)$/;
