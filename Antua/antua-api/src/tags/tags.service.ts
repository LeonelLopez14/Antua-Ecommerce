import { Injectable, NotFoundException } from '@nestjs/common';
import { Tag } from './entities/tag.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm/repository/Repository.js';
import { CreateTagDto } from './dto/tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

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

    //metodo para buscar un tag mediante id
    async findOne(id: number) {

        const tag = await this.tagRepository.findOne({
            where: { id },
        });

        if (!tag) {
            throw new NotFoundException('tag no encontrado.');
        }

        return tag;
    }

    //metodo para crear un tag
    async create(dto: CreateTagDto) {

        const newTag = this.tagRepository.create(dto);

        if (!newTag) {
            throw new NotFoundException('No se pudo crear el tag');
        }

        return await this.tagRepository.save(dto);
    }

    //Metodo para actualizar un tag mediante id
    async update(id: number, dto: UpdateTagDto) {
        const tag = await this.tagRepository.findOne({
            where: { id },
        });

        if (!tag) {
            throw new NotFoundException('Tag no encontrado');
        }

        Object.assign(tag, dto);

        return this.tagRepository.save(tag);
    }

    //metodo para eliminar un tag mediante id
    async remove(id: number) {
        const tag = await this.tagRepository.delete(id);

        if (tag.affected === 0) {
            throw new NotFoundException('No se encontro el tag');
        }

        return {
            message: 'Tag eliminado',
        }
    }
}
