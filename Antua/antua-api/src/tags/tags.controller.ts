import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { TagsService } from './tags.service';

// Solo lectura y solo tags activos. Las escrituras están en /admin/tags.
@Controller('tags')
export class TagsController {
  constructor(private readonly tagService: TagsService) {}

  @Get()
  findAll() {
    return this.tagService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tagService.findOne(id);
  }
}
