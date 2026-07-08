import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [UsersModule], // Import UsersModule to use User repository
  controllers: [AuthController],
  providers: [AuthService]
})
export class AuthModule {}
