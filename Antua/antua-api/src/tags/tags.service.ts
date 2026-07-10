import { Injectable } from '@nestjs/common';
import { Tag } from './entities/tag.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm/repository/Repository.js';

@Injectable()
export class TagsService {

    constructor(
        @InjectRepository(Tag)
        private readonly tagRepository: Repository<Tag>,
    ) {}


    //Metodo para obtener todos los tags para un filtro
    async findAllTags() {
        return this.tagRepository.find({
            order: { name: 'ASC' },
        });
    }
}
