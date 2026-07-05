import { Module } from '@nestjs/common';
import { CouponsService } from './coupons.service';

@Module({
  providers: [CouponsService]
})
export class CouponsModule {}
