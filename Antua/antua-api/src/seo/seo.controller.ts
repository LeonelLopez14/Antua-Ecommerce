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
    // Solo productos activos. lastmod: el último cambio registrado en la auditoría del panel (que
    // también cuenta cambios de variantes e imágenes) y, si la base ya tiene `products.updated_at`
    // (migración propuesta ProductsUpdatedAt), el más reciente de los dos. Sin ninguno, no hay lastmod.
    const audit =
      "(SELECT MAX(a.created_at) FROM admin_audit_log a WHERE a.entity = 'product' AND a.entity_id = p.id)";
    const lastmod = (await this.productsHaveUpdatedAt())
      ? `GREATEST(p.updated_at, COALESCE(${audit}, p.updated_at))`
      : audit;
    const rows: { slug: string; lastmod: Date | string | null }[] =
      await this.dataSource
        .getRepository(Product)
        .createQueryBuilder('p')
        .select('p.slug', 'slug')
        .addSelect(lastmod, 'lastmod')
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

  /**
   * Se consulta en cada pedido del sitemap (lo piden pocas veces y lo cachea el navegador una hora):
   * así, al aplicar la migración, el sitemap la usa sin reiniciar la API. Si la consulta falla, sigue
   * con la auditoría.
   */
  private async productsHaveUpdatedAt(): Promise<boolean> {
    try {
      const [row] = await this.dataSource.query<{ found: number | string }[]>(
        "SELECT COUNT(*) AS found FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'updated_at'",
      );
      return Number(row?.found) > 0;
    } catch {
      return false;
    }
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  robots(): string {
    return renderRobots(this.config.getOrThrow<string>('PUBLIC_URL'));
  }
}
