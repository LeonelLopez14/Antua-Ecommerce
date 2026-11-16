import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Min } from 'class-validator';
import { PageQueryDto } from './page-query.dto';

export class AuditQueryDto extends PageQueryDto {
  @IsOptional()
  @Matches(/^[a-z_]{1,50}$/)
  entity?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  entityId?: number;

  @IsOptional()
  @Matches(/^[a-z_.]{1,50}$/)
  action?: string;
}
