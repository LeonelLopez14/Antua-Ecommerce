import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuditLog } from './entities/admin-audit-log.entity';
import { AuditService } from './audit.service';
import { AdminAuditController } from './admin-audit.controller';

/** Panel de administración: todo lo que vive bajo /admin. */
@Module({
  imports: [TypeOrmModule.forFeature([AdminAuditLog])],
  controllers: [AdminAuditController],
  providers: [AuditService],
})
export class AdminModule {}
