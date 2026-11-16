import { detectImageKind, UPLOADED_FILE_NAME } from './image-file';

const bytes = (...values: number[]) => Buffer.from(values);

describe('detectImageKind', () => {
  it('reconoce JPEG, PNG y WebP por su contenido', () => {
    expect(detectImageKind(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('jpg');
    expect(
      detectImageKind(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0)),
    ).toBe('png');
    expect(detectImageKind(Buffer.from('RIFF\x10\x00\x00\x00WEBPVP8 '))).toBe(
      'webp',
    );
  });

  it('rechaza lo demás aunque se llame .png', () => {
    expect(
      detectImageKind(Buffer.from('<html><script>alert(1)</script>')),
    ).toBeNull();
    expect(detectImageKind(Buffer.from('GIF89a'))).toBeNull();
    expect(
      detectImageKind(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')),
    ).toBeNull();
    expect(detectImageKind(Buffer.alloc(0))).toBeNull();
  });

  it('los nombres de archivo válidos son solo los que genera el servidor', () => {
    expect(
      UPLOADED_FILE_NAME.test('0123456789abcdef0123456789abcdef.webp'),
    ).toBe(true);
    expect(UPLOADED_FILE_NAME.test('../../etc/passwd')).toBe(false);
    expect(UPLOADED_FILE_NAME.test('foto.png')).toBe(false);
  });
});
