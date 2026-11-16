import {
  Body,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { User } from 'src/users/entities/user.entity';
import { AdminUser } from '../admin-user.decorator';
import { AdminController } from '../roles.decorator';
import { AdminProductsService } from './admin-products.service';
import {
  AdminProductQueryDto,
  CreateAdminProductDto,
  CreateVariantDto,
  ImageOrderDto,
  StockMovementDto,
  UpdateAdminProductDto,
  UpdateVariantDto,
} from './dto/admin-product.dto';
import { MAX_IMAGE_BYTES } from './image-file';

@AdminController('products')
export class AdminProductsController {
  constructor(private readonly products: AdminProductsService) {}

  @Get()
  findAll(@Query() query: AdminProductQueryDto) {
    return this.products.findPage(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.products.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAdminProductDto, @AdminUser() admin: User) {
    return this.products.create(dto, admin);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAdminProductDto,
    @AdminUser() admin: User,
  ) {
    return this.products.update(id, dto, admin);
  }

  /** Borra solo si no tiene historial; si no, lo desactiva y lo explica en `message`. */
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @AdminUser() admin: User) {
    return this.products.remove(id, admin);
  }

  @Post(':id/variants')
  addVariant(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateVariantDto,
    @AdminUser() admin: User,
  ) {
    return this.products.addVariant(id, dto, admin);
  }

  @Patch(':id/variants/:variantId')
  updateVariant(
    @Param('id', ParseIntPipe) id: number,
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() dto: UpdateVariantDto,
    @AdminUser() admin: User,
  ) {
    return this.products.updateVariant(id, variantId, dto, admin);
  }

  @Delete(':id/variants/:variantId')
  removeVariant(
    @Param('id', ParseIntPipe) id: number,
    @Param('variantId', ParseIntPipe) variantId: number,
    @AdminUser() admin: User,
  ) {
    return this.products.removeVariant(id, variantId, admin);
  }

  @Post(':id/variants/:variantId/stock')
  @HttpCode(200)
  moveStock(
    @Param('id', ParseIntPipe) id: number,
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() dto: StockMovementDto,
    @AdminUser() admin: User,
  ) {
    return this.products.moveStock(id, variantId, dto, admin);
  }

  /** multipart/form-data con el campo `file`. El archivo queda en memoria hasta validarlo. */
  @Post(':id/images')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 0, parts: 2 },
    }),
  )
  addImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @AdminUser() admin: User,
  ) {
    return this.products.addImage(id, file, admin);
  }

  @Patch(':id/images/order')
  reorderImages(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ImageOrderDto,
    @AdminUser() admin: User,
  ) {
    return this.products.reorderImages(id, dto.imageIds, admin);
  }

  @Patch(':id/images/:imageId/primary')
  setPrimary(
    @Param('id', ParseIntPipe) id: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @AdminUser() admin: User,
  ) {
    return this.products.setPrimaryImage(id, imageId, admin);
  }

  @Delete(':id/images/:imageId')
  removeImage(
    @Param('id', ParseIntPipe) id: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @AdminUser() admin: User,
  ) {
    return this.products.removeImage(id, imageId, admin);
  }
}
