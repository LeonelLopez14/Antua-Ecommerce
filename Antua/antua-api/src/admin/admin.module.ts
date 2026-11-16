import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuditLog } from './entities/admin-audit-log.entity';
import { AuditService } from './audit.service';
import { AdminAuditController } from './admin-audit.controller';
import { AdminProductsController } from './catalog/admin-products.controller';
import { AdminProductsService } from './catalog/admin-products.service';
import { AdminTagsController } from './catalog/admin-tags.controller';
import { AdminTagsService } from './catalog/admin-tags.service';

/** Panel de administración: todo lo que vive bajo /admin. */
@Module({
  imports: [TypeOrmModule.forFeature([AdminAuditLog])],
  controllers: [
    AdminAuditController,
    AdminProductsController,
    AdminTagsController,
  ],
  providers: [AuditService, AdminProductsService, AdminTagsService],
})
export class AdminModule {}
