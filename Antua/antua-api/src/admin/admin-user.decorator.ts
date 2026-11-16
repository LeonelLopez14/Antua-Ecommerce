import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { User } from 'src/users/entities/user.entity';

/** El administrador autenticado (AdminAccessGuard ya verificó el JWT y el rol). */
export const AdminUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User =>
    context.switchToHttp().getRequest<Request & { user: User }>().user,
);
