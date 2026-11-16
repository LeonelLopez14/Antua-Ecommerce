import { applyDecorators, Controller, SetMetadata } from '@nestjs/common';
import { UserRole } from 'src/users/entities/user.entity';

export const ROLES_KEY = 'roles';

/** Roles que pueden usar un controller o un endpoint. Lo hace cumplir AdminAccessGuard. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/** Controller del panel: vive bajo /admin y solo lo usan administradores. */
export const AdminController = (path: string) =>
  applyDecorators(Controller(`admin/${path}`), Roles(UserRole.ADMIN));
