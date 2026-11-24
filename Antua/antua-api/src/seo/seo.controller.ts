import { Controller, Get, Header } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Product } from 'src/products/entities/product.entity';
import { renderRobots, renderSitemap, type SitemapProduct } from './seo';

/**
 * /sitemap.xml y /robots.txt para los buscadores. Los arma la API porque necesitan la URL pública
 * (PUBLIC_URL) y la lista de productos activos. En producción, Caddy los sirve en la raíz del sitio.
 *
 *   curl https://tu-sitio/sitemap.xml
 *   curl https://tu-sitio/robots.txt
 */
@Controller()
export class SeoController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  async sitemap(): Promise<string> {
    // Solo productos activos. lastmod: el último cambio registrado en la auditoría del panel
    // (los productos no tienen columna de fecha de actualización).
    const rows: { slug: string; lastmod: Date | string | null }[] =
      await this.dataSource
        .getRepository(Product)
        .createQueryBuilder('p')
        .select('p.slug', 'slug')
        .addSelect(
          "(SELECT MAX(a.created_at) FROM admin_audit_log a WHERE a.entity = 'product' AND a.entity_id = p.id)",
          'lastmod',
        )
        .where('p.is_active = true')
        .orderBy('p.slug', 'ASC')
        .getRawMany();
    const products: SitemapProduct[] = rows.map((row) => ({
      slug: row.slug,
      lastmod: row.lastmod ? new Date(row.lastmod) : null,
    }));
    return renderSitemap(
      this.config.getOrThrow<string>('PUBLIC_URL'),
      products,
    );
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  robots(): string {
    return renderRobots(this.config.getOrThrow<string>('PUBLIC_URL'));
  }
}
