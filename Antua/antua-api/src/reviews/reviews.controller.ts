import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

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

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('slug') slug: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReviewDto,
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.reviewsService.update(slug, id, req.user.id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  remove(
    @Param('slug') slug: string,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.reviewsService.remove(slug, id, req.user.id);
  }
}
