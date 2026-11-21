import { IsEnum, IsIn, IsOptional, Matches } from 'class-validator';
import { OrderStatus } from 'src/orders/entities/order.entity';
import { PaymentStatus } from 'src/payments/payment-state';

const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** `semicolon` (por defecto, Excel con configuración de Uruguay) o `comma`. */
export class ExportFormatDto {
  @IsOptional()
  @IsIn(['semicolon', 'comma'])
  separator?: 'semicolon' | 'comma';
}

/**
 * Exportación de pedidos: los mismos filtros que el listado del panel, más un rango de fechas
 * OBLIGATORIO (días de calendario de Montevideo, inclusive).
 */
export class ExportOrdersQueryDto extends ExportFormatDto {
  @Matches(DAY, { message: 'from: obligatoria, con formato AAAA-MM-DD' })
  from: string;

  @Matches(DAY, { message: 'to: obligatoria, con formato AAAA-MM-DD' })
  to: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsIn([...Object.values(PaymentStatus), 'amount_mismatch'])
  payment_status?: string;
}
