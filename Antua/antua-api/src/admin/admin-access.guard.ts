import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { User, UserRole } from 'src/users/entities/user.entity';
import { ROLES_KEY } from './roles.decorator';

const ADMIN_PATH = /^\/admin(\/|$)/i;

/**
 * Guard global (APP_GUARD): corre en TODAS las rutas antes que los guards de cada controller.
 *
 * - Toda ruta bajo /admin exige un JWT válido (si no, 401) y un rol permitido (si no, 403).
 * - Denegar por defecto: una ruta /admin sin @Roles responde 403 aunque nadie le haya puesto guard.
 * - El rol sale de la base: JwtStrategy busca al usuario en cada request, y el JWT solo lleva su id.
 *   Un cliente no puede "declararse" admin editando su token (además, la firma lo invalidaría).
 */
@Injectable()
export class AdminAccessGuard implements CanActivate {
  private readonly jwtGuard = new JwtAuthGuard();

  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: User }>();
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!roles && !ADMIN_PATH.test(request.path)) return true;

    // Lanza 401 si no hay token o no es válido.
    await (this.jwtGuard.canActivate(context) as Promise<boolean>);

    const role = request.user?.role;
    if (!roles?.length || !role || !roles.includes(role)) {
      throw new ForbiddenException(
        'No tenés permiso para entrar a esta sección.',
      );
    }
    return true;
  }
}
