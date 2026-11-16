import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { OrderStatus } from 'src/orders/entities/order.entity';
import { PaymentStatus } from 'src/payments/payment-state';
import { PageQueryDto } from '../dto/page-query.dto';

const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class AdminOrderQueryDto extends PageQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsIn([...Object.values(PaymentStatus), 'amount_mismatch'])
  payment_status?: string;

  /** Días de calendario en hora de Uruguay, inclusive: ?from=2026-11-01&to=2026-11-15. */
  @IsOptional()
  @Matches(DAY, { message: 'from: fecha con formato AAAA-MM-DD' })
  from?: string;

  @IsOptional()
  @Matches(DAY, { message: 'to: fecha con formato AAAA-MM-DD' })
  to?: string;

  /** Número de pedido o parte del email. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(150)
  q?: string;
}

export class ChangeOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;
}

export class OrderNoteDto {
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  note: string;
}
