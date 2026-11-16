import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuditLog } from './entities/admin-audit-log.entity';
import { AuditService } from './audit.service';
import { AdminAuditController } from './admin-audit.controller';
import { AdminProductsController } from './catalog/admin-products.controller';
import { AdminProductsService } from './catalog/admin-products.service';
import { AdminTagsController } from './catalog/admin-tags.controller';
import { AdminTagsService } from './catalog/admin-tags.service';
import { AdminCouponsController } from './coupons/admin-coupons.controller';
import { AdminCouponsService } from './coupons/admin-coupons.service';
import { AdminOrdersController } from './orders/admin-orders.controller';
import { AdminOrdersService } from './orders/admin-orders.service';

/** Panel de administración: todo lo que vive bajo /admin. */
@Module({
  imports: [TypeOrmModule.forFeature([AdminAuditLog])],
  controllers: [
    AdminAuditController,
    AdminProductsController,
    AdminTagsController,
    AdminCouponsController,
    AdminOrdersController,
  ],
  providers: [
    AuditService,
    AdminProductsService,
    AdminTagsService,
    AdminCouponsService,
    AdminOrdersService,
  ],
})
export class AdminModule {}
