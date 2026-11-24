import { DISALLOWED, PUBLIC_PAGES, renderRobots, renderSitemap } from './seo';

describe('SEO', () => {
  it('el sitemap tiene las páginas públicas y los productos activos con lastmod', () => {
    const xml = renderSitemap('https://antojarte.lan/', [
      { slug: 'clasica', lastmod: new Date('2026-11-20T10:00:00Z') },
      { slug: 'vegana', lastmod: null },
    ]);
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
    expect(xml).toContain('<loc>https://antojarte.lan/</loc>');
    for (const page of PUBLIC_PAGES.filter((p) => p !== '/')) {
      expect(xml).toContain(`<loc>https://antojarte.lan${page}</loc>`);
    }
    expect(xml).toContain(
      '<url><loc>https://antojarte.lan/producto/clasica</loc><lastmod>2026-11-20T10:00:00.000Z</lastmod></url>',
    );
    expect(xml).toContain(
      '<url><loc>https://antojarte.lan/producto/vegana</loc></url>',
    );
    expect(xml).not.toMatch(/admin|cuenta|checkout/);
  });

  it('escapa el XML', () => {
    expect(
      renderSitemap('https://a.test', [{ slug: 'a&b', lastmod: null }]),
    ).toContain('/producto/a%26b');
    expect(renderSitemap('https://a.test/?x=1&y=2', [])).toContain('&amp;');
  });

  it('robots.txt bloquea lo privado y apunta al sitemap con URL absoluta', () => {
    const robots = renderRobots('https://antojarte.lan');
    for (const path of DISALLOWED)
      expect(robots).toContain(`Disallow: ${path}`);
    expect(robots).toContain('Sitemap: https://antojarte.lan/sitemap.xml');
  });
});
