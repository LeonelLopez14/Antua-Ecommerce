import { numberCell, row, storeIso, textCell } from './csv';

describe('CSV', () => {
  it('protege contra inyección de fórmulas en los textos', () => {
    for (const dangerous of [
      '=HYPERLINK("http://x")',
      '+1+1',
      '-2+3',
      '@SUM(A1)',
      '\tx',
      '\rx',
    ]) {
      expect(
        textCell(dangerous, ';').startsWith("'") ||
          textCell(dangerous, ';').startsWith('"\''),
      ).toBe(true);
    }
    expect(textCell('Clásica', ';')).toBe('Clásica');
  });

  it('pone entre comillas lo que tiene separador, comillas o saltos de línea', () => {
    expect(textCell('a;b', ';')).toBe('"a;b"');
    expect(textCell('a;b', ',')).toBe('a;b');
    expect(textCell('a,b', ',')).toBe('"a,b"');
    expect(textCell('dijo "hola"', ';')).toBe('"dijo ""hola"""');
    expect(textCell('línea 1\nlínea 2', ';')).toBe('"línea 1\nlínea 2"');
    // Fórmula y separador a la vez: apóstrofo y comillas.
    expect(textCell('=1;2', ';')).toBe('"\'=1;2"');
  });

  it('los montos son números sin formato localizado', () => {
    expect(numberCell('1500')).toBe('1500.00');
    expect(numberCell(1234.5)).toBe('1234.50');
    expect(numberCell(7, 0)).toBe('7');
    expect(numberCell(null)).toBe('');
    expect(numberCell('abc')).toBe('');
  });

  it('las filas terminan en CRLF', () => {
    expect(row(['a', 'b'], ';')).toBe('a;b\r\n');
  });

  it('las fechas van en ISO 8601 con la hora de Montevideo', () => {
    expect(storeIso(new Date('2026-11-20T15:30:05Z'))).toBe(
      '2026-11-20T12:30:05-03:00',
    );
    // Pasada la medianoche UTC sigue siendo el día anterior en Montevideo.
    expect(storeIso('2026-11-21T01:00:00Z')).toBe('2026-11-20T22:00:00-03:00');
    expect(storeIso(null)).toBe('');
  });
});
