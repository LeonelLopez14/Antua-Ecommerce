import { ConflictException, Injectable } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

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
            phone: '',
        });

        const token = this.jwtService.sign({
            sub: user.id,
            email: user.email
        });

        return { user, token };
    }
}