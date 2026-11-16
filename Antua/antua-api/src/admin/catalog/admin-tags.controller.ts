import { Body, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { User } from 'src/users/entities/user.entity';
import { AdminUser } from '../admin-user.decorator';
import { AdminController } from '../roles.decorator';
import { AdminTagsService } from './admin-tags.service';
import { CreateTagDto, UpdateTagDto } from './dto/admin-tag.dto';

/** Sin DELETE: los tags se desactivan. Así nunca se rompe un link de la Home ni de la Tienda. */
@AdminController('tags')
export class AdminTagsController {
  constructor(private readonly tags: AdminTagsService) {}

  @Get()
  findAll() {
    return this.tags.findAll();
  }

  @Post()
  create(@Body() dto: CreateTagDto, @AdminUser() admin: User) {
    return this.tags.create(dto, admin);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTagDto,
    @AdminUser() admin: User,
  ) {
    return this.tags.update(id, dto, admin);
  }
}
