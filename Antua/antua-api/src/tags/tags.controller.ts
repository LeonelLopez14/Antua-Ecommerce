import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Controller('tags')
export class TagsController {

    constructor(private readonly tagService: TagsService) {}

    @Get()
    findAll() {
        return this.tagService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: number) {
        return this.tagService.findOne(id);
    }

    @Post()
    create(@Body() dto: CreateTagDto) {
        return this.tagService.create(dto);
    }

    @Patch(':id')
    update(@Param('id') id: number, @Body() dto: UpdateTagDto) {
        return this.tagService.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: number) {
        return this.tagService.remove(id);
    }
}
