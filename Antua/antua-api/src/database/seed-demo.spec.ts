import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  assertDemoPassword,
  assertNotProduction,
  loadDemoData,
  variantPrices,
} from '../../scripts/seed-demo';

describe('seed:demo', () => {
  const data = loadDemoData();

  it('se niega a correr en producción', () => {
    expect(() => assertNotProduction({ NODE_ENV: 'production' })).toThrow(
      'NODE_ENV=production',
    );
    expect(() =>
      assertNotProduction({ NODE_ENV: 'development' }),
    ).not.toThrow();
  });

  it('no tiene contraseña por defecto: exige una válida en el entorno', () => {
    expect(() => assertDemoPassword('DEMO_PASSWORD', undefined)).toThrow(
      'No hay contraseña por defecto',
    );
    for (const weak of ['corta1', 'sinnumeros', '12345678', 'a1'.repeat(40)])
      expect(() => assertDemoPassword('DEMO_PASSWORD', weak)).toThrow();
    expect(() =>
      assertDemoPassword('DEMO_PASSWORD', 'DemoClave2026'),
    ).not.toThrow();
    // Ninguna contraseña escrita en los datos ni en el script.
    const script = readFileSync(
      join(__dirname, '../../scripts/seed-demo.ts'),
      'utf8',
    );
    expect(JSON.stringify(data)).not.toMatch(/password|contraseña|clave/i);
    expect(script).not.toMatch(/DEMO_PASSWORD\s*\?\?|\|\|\s*['"][^'"]{6,}['"]/);
  });

  it('las seis categorías de DESIGN.md, con dos productos cada una', () => {
    expect(data.tags.map((t) => t.slug)).toEqual([
      'clasicas',
      'sin-gluten',
      'veganas',
      'sin-azucar',
      'de-temporada',
      'packs',
    ]);
    for (const tag of data.tags) {
      const count = data.products.filter((p) => p.tags[0] === tag.slug).length;
      expect({ tag: tag.slug, count }).toEqual({ tag: tag.slug, count: 2 });
    }
  });

  it('todo lleva prefijo de demo y está marcado como ejemplo', () => {
    for (const product of data.products)
      expect(product.slug).toMatch(/^demo-[a-z0-9-]+$/);
    expect(data.coupon.code).toMatch(/^DEMO/);
    expect(data.customer.email).toMatch(/^demo\.[a-z]+@antojarte\.example$/);
    for (const review of data.reviews)
      expect(review.author).toContain('(ejemplo)');
    expect(
      new Set(data.reviews.map((r) => `${r.product}|${r.author}`)).size,
    ).toBe(data.reviews.length);
    for (const review of data.reviews)
      expect(data.products.some((p) => p.slug === review.product)).toBe(true);
  });

  it('cada producto tiene su ilustración propia, sin scripts', () => {
    const dir = join(__dirname, '../../../antua-web/public/demo/productos');
    for (const product of data.products) {
      const file = join(dir, `${product.slug}.svg`);
      expect(existsSync(file)).toBe(true);
      const svg = readFileSync(file, 'utf8');
      expect(svg).toContain('Imagen de ejemplo');
      expect(svg).not.toMatch(/<script|on[a-z]+=|href=|xlink/i);
      expect(Buffer.byteLength(svg)).toBeLessThan(12_000);
    }
  });

  it('x6 y x12 con un descuento por cantidad, redondeado a 10 pesos', () => {
    expect(variantPrices(130)).toEqual({ x1: 130, x6: 720, x12: 1330 });
    for (const product of data.products) {
      const p = variantPrices(product.price);
      expect(p.x6).toBeLessThan(p.x1 * 6);
      expect(p.x12).toBeLessThan(p.x6 * 2);
    }
  });
});
