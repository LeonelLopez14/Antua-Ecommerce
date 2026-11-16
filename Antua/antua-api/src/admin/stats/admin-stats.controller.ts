import { Get } from '@nestjs/common';
import { AdminController } from '../roles.decorator';
import { AdminStatsService } from './admin-stats.service';

@AdminController('stats')
export class AdminStatsController {
  constructor(private readonly stats: AdminStatsService) {}

  @Get()
  summary() {
    return this.stats.summary();
  }
}
