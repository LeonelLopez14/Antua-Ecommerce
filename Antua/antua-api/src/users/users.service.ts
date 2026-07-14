import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/user.dto';

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
}
