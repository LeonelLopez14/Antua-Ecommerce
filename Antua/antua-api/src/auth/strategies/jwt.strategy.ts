import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from 'src/users/users.service';
import { User } from 'src/users/entities/user.entity';

/** Cambiar la contraseña cierra las demás sesiones: un JWT robado deja de servir. `iat` tiene segundos. */
function isIssuedBeforePasswordChange(
  issuedAt: number | undefined,
  user: User,
): boolean {
  if (!user.password_changed_at) return false;
  const changedAt = Math.floor(user.password_changed_at.getTime() / 1000);
  return issuedAt === undefined || issuedAt < changedAt;
}

//validar un JWT y devolver el usuario autenticado
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersService: UsersService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: { sub: number; iat?: number }) {
    const user = await this.usersService.findById(payload.sub);

    if (!user || isIssuedBeforePasswordChange(payload.iat, user)) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
