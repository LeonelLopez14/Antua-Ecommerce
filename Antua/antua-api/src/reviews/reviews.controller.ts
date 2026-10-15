import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateReviewDto } from './dto/create-review.dto';

@Controller('products/:slug/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  findAll(@Param('slug') slug: string) {
    return this.reviewsService.findAllByProductSlug(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Param('slug') slug: string,
    @Body() dto: CreateReviewDto,
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.reviewsService.create(slug, req.user.id, dto);
  }
}
