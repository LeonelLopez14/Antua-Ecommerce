import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findByEmail(email: string) {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    return user;
  }

  async create(dto: CreateUserDto) {
    const user = this.userRepository.create(dto);

    return this.userRepository.save(user);
  }

  async updateProfile(id: number, dto: UpdateProfileDto) {
    await this.userRepository.update(id, dto);
    return this.userRepository.findOneByOrFail({ id });
  }

  /** Guarda el hash nuevo y marca desde cuándo dejan de valer los JWT anteriores. */
  async updatePassword(id: number, password_hash: string) {
    await this.userRepository.update(id, {
      password_hash,
      // Truncada al segundo: MySQL redondearía hacia arriba y el JWT nuevo parecería anterior al cambio.
      password_changed_at: new Date(Math.floor(Date.now() / 1000) * 1000),
    });
  }

  async findById(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    return user;
  }
}
