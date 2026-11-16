import {
  Body,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { User } from 'src/users/entities/user.entity';
import { AdminUser } from '../admin-user.decorator';
import { AdminController } from '../roles.decorator';
import { AdminModerationService } from './admin-moderation.service';
import {
  AdminReviewQueryDto,
  AdminUserQueryDto,
  ReviewVisibilityDto,
} from './moderation.dto';

@AdminController('reviews')
export class AdminReviewsController {
  constructor(private readonly moderation: AdminModerationService) {}

  @Get()
  findAll(@Query() query: AdminReviewQueryDto) {
    return this.moderation.findReviews(query);
  }

  @Patch(':id')
  setVisibility(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewVisibilityDto,
    @AdminUser() admin: User,
  ) {
    return this.moderation.setReviewHidden(id, dto.is_hidden, admin);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @AdminUser() admin: User) {
    return this.moderation.removeReview(id, admin);
  }
}

/** Solo lectura: el panel no cambia roles ni contraseñas. */
@AdminController('users')
export class AdminUsersController {
  constructor(private readonly moderation: AdminModerationService) {}

  @Get()
  findAll(@Query() query: AdminUserQueryDto) {
    return this.moderation.findUsers(query);
  }
}
