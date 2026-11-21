import { Get, Query, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { User } from 'src/users/entities/user.entity';
import { AdminUser } from '../admin-user.decorator';
import { AdminController } from '../roles.decorator';
import { ExportFormatDto, ExportOrdersQueryDto } from './admin-exports.dto';
import { AdminExportsService, type CsvExport } from './admin-exports.service';

/**
 * Exportaciones CSV del panel. Solo admins (@AdminController: el guard global niega por defecto y
 * test/admin-auth.e2e-spec.ts recorre esta ruta como todas las de /admin). Cada exportación queda
 * en la auditoría.
 *
 *   GET /admin/exports/orders.csv?from=2026-11-01&to=2026-11-30[&status=…][&payment_status=…][&separator=comma]
 *   GET /admin/exports/products.csv[?separator=comma]
 */
@AdminController('exports')
export class AdminExportsController {
  constructor(private readonly exports: AdminExportsService) {}

  @Get('orders.csv')
  async orders(
    @Query() query: ExportOrdersQueryDto,
    @AdminUser() admin: User,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    return file(await this.exports.orders(query, admin), res);
  }

  @Get('products.csv')
  async products(
    @Query() query: ExportFormatDto,
    @AdminUser() admin: User,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    return file(await this.exports.products(query, admin), res);
  }
}

/** El archivo en streaming, con la cantidad de filas en un header (el panel la muestra). */
function file(
  { stream, filename, rows }: CsvExport,
  res: Response,
): StreamableFile {
  res.setHeader('X-Export-Rows', String(rows));
  // Los datos del panel no se guardan en cachés intermedias.
  res.setHeader('Cache-Control', 'no-store');
  return new StreamableFile(stream, {
    type: 'text/csv; charset=utf-8',
    disposition: `attachment; filename="${filename}"`,
  });
}
