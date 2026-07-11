import { Injectable, NotFoundException } from '@nestjs/common';
import { Tag } from './entities/tag.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm/repository/Repository.js';
import { CreateTagDto } from './dto/tag.dto';

@Injectable()
export class TagsService {

    constructor(
        @InjectRepository(Tag)
        private readonly tagRepository: Repository<Tag>,
    ) {}


    //Metodo para obtener todos los tags para un filtro
    async findAll() {
        return this.tagRepository.find({
            order: { name: 'ASC' },
        });
    }

    async findOne(id: number) {

        const tag = await this.tagRepository.findOne({
            where: { id },
        });

        if (!tag) {
            throw new NotFoundException('tag no encontrado.');
        }

        return tag;
    }

    async create(dto: CreateTagDto) {

        const newTag = this.tagRepository.create(dto);

        if (!newTag) {
            throw new NotFoundException('No se pudo crear el tag');
        }

        return await this.tagRepository.save(dto);
    }
}
