import { Injectable, NotFoundException } from '@nestjs/common';
import { Tag } from './entities/tag.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
  ) {}

  //Metodo para obtener todos los tags para un filtro
  async findAll() {
    return this.tagRepository.find({
      where: { is_active: true },
      order: { name: 'ASC' },
    });
  }

  //metodo para buscar un tag mediante id
  async findOne(id: number) {
    const tag = await this.tagRepository.findOne({
      where: { id, is_active: true },
    });

    if (!tag) {
      throw new NotFoundException('tag no encontrado.');
    }

    return tag;
  }
}
