/**
 * Páginas públicas del front que se indexan (las mismas rutas que antua-web/src/App.tsx).
 * Si se agrega una página pública, sumarla acá. Lo privado (cuenta, checkout, panel, pedidos)
 * NO va: además lo excluye robots.txt.
 */
export const PUBLIC_PAGES = [
  '/',
  '/tienda',
  '/nosotros',
  '/preguntas-frecuentes',
  '/contacto',
  '/terminos',
  '/privacidad',
] as const;

/** Rutas que los buscadores no tienen que recorrer (iguales a antua-web/public/robots.txt). */
export const DISALLOWED = [
  '/admin',
  '/cuenta',
  '/checkout',
  '/pedido',
  '/pago',
  '/api',
] as const;

export interface SitemapProduct {
  slug: string;
  /** Último cambio conocido (auditoría del panel), o null si nunca se editó. */
  lastmod: Date | null;
}

const escapeXml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

const entry = (loc: string, lastmod: Date | null): string =>
  `  <url><loc>${escapeXml(loc)}</loc>${lastmod ? `<lastmod>${lastmod.toISOString()}</lastmod>` : ''}</url>`;

/** sitemap.xml (protocolo sitemaps.org 0.9): páginas públicas y productos activos. */
export function renderSitemap(
  siteUrl: string,
  products: SitemapProduct[],
): string {
  const base = siteUrl.replace(/\/+$/, '');
  const urls = [
    ...PUBLIC_PAGES.map((path) =>
      entry(`${base}${path === '/' ? '/' : path}`, null),
    ),
    ...products.map((product) =>
      entry(
        `${base}/producto/${encodeURIComponent(product.slug)}`,
        product.lastmod,
      ),
    ),
  ];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

/** robots.txt con la URL absoluta del sitemap (el protocolo la exige absoluta). */
export function renderRobots(siteUrl: string): string {
  const base = siteUrl.replace(/\/+$/, '');
  return [
    'User-agent: *',
    ...DISALLOWED.map((path) => `Disallow: ${path}`),
    '',
    `Sitemap: ${base}/sitemap.xml`,
    '',
  ].join('\n');
}
