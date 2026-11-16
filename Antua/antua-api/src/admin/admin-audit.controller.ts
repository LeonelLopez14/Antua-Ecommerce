import { Get, Query } from '@nestjs/common';
import { AdminController } from './roles.decorator';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';

@AdminController('audit')
export class AdminAuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  findAll(@Query() query: AuditQueryDto) {
    return this.auditService.findPage(query);
  }
}
