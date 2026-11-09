import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { User } from 'src/users/entities/user.entity';

/** Hash de bcrypt de un valor descartable, con el mismo costo que los reales. */
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('antua-dummy', 10);

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}
  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('Email ya registrado.');
    }

    const password_hash = await bcrypt.hash(dto.password, 10);

    const user = await this.usersService.create({
      full_name: dto.full_name,
      email: dto.email,
      password_hash,
      phone: undefined,
    });

    return { user, token: this.signToken(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    // Si el email no existe se compara igual: si no, el tiempo de respuesta revelaría qué cuentas existen.
    const passwordValidation = await bcrypt.compare(
      dto.password,
      user?.password_hash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordValidation) {
      throw new UnauthorizedException('Credenciales incorrectas.');
    }

    return { user, token: this.signToken(user) };
  }

  /** Pide la contraseña actual y devuelve un JWT nuevo: los anteriores dejan de valer. */
  async changePassword(user: User, dto: ChangePasswordDto) {
    const matches = await bcrypt.compare(
      dto.currentPassword,
      user.password_hash,
    );

    if (!matches) {
      throw new UnauthorizedException('La contraseña actual no coincide.');
    }

    await this.usersService.updatePassword(
      user.id,
      await bcrypt.hash(dto.newPassword, 10),
    );

    return { user, token: this.signToken(user) };
  }

  private signToken(user: User) {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });
  }
}
