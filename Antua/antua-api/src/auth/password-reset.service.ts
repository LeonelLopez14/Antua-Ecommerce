import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { generateToken, hashToken } from 'src/common/secure-token';
import { MailService } from 'src/mail/mail.service';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';
import { PasswordResetToken } from './entities/password-reset-token.entity';

const TOKEN_LIFETIME_MINUTES = 60;
/** Pedidos por cuenta y por hora: evita usar el flujo para llenar de mails a alguien. */
const MAX_REQUESTS_PER_HOUR = 3;
const INVALID_TOKEN = 'El link no es valido o ya vencio.';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly tokens: Repository<PasswordResetToken>,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Se responde de inmediato y lo demás corre en segundo plano: ni el contenido ni
   * el tiempo de la respuesta revelan si el email tiene una cuenta.
   */
  requestReset(email: string): void {
    this.issueToken(email).catch(() => {
      this.logger.error('No se pudo procesar un pedido de recuperación.');
    });
  }

  private async issueToken(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user || (await this.hasTooManyRecentRequests(user))) return;

    // Un link nuevo anula los anteriores que no se usaron.
    await this.tokens.delete({ user: { id: user.id }, used_at: IsNull() });

    const token = generateToken();
    await this.tokens.save({
      user,
      token_hash: hashToken(token),
      expires_at: new Date(Date.now() + TOKEN_LIFETIME_MINUTES * 60_000),
    });

    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
    const link = `${frontendUrl}/restablecer-contrasena?token=${token}`;
    await this.mailService.sendPasswordReset(
      user.email,
      link,
      TOKEN_LIFETIME_MINUTES,
    );
  }

  private async hasTooManyRecentRequests(user: User): Promise<boolean> {
    const count = await this.tokens.count({
      where: {
        user: { id: user.id },
        created_at: MoreThan(new Date(Date.now() - 3_600_000)),
      },
    });
    return count >= MAX_REQUESTS_PER_HOUR;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const record = await this.tokens.findOne({
      where: { token_hash: hashToken(token) },
      relations: { user: true },
    });

    if (!record || record.used_at || record.expires_at <= new Date()) {
      throw new BadRequestException(INVALID_TOKEN);
    }

    // La condición `used_at IS NULL` hace atómico el "un solo uso": con dos pedidos simultáneos, gana uno.
    const claimed = await this.tokens.update(
      { id: record.id, used_at: IsNull() },
      { used_at: new Date() },
    );
    if (claimed.affected !== 1) throw new BadRequestException(INVALID_TOKEN);

    await this.usersService.updatePassword(
      record.user.id,
      await bcrypt.hash(newPassword, 10),
    );
  }
}
