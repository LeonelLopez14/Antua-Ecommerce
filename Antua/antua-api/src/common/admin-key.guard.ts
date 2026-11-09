import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';

/**
 * Protege las escrituras del catálogo, que antes eran públicas: cualquiera podía crear,
 * modificar o borrar productos. Todavía no hay roles ni panel de administración, así que
 * se exige X-Admin-Key. Sin ADMIN_API_KEY configurada, nadie puede usarlas.
 */
@Injectable()
export class AdminKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.configService.get<string>('ADMIN_API_KEY');
    const given = context.switchToHttp().getRequest<Request>().headers[
      'x-admin-key'
    ];

    if (expected && typeof given === 'string') {
      const a = Buffer.from(expected);
      const b = Buffer.from(given);
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    }

    throw new ForbiddenException('Operacion no permitida.');
  }
}
