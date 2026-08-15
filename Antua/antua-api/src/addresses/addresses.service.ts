import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Address } from './entities/address.entity';
import { Repository } from 'typeorm';
import { CreateAddressDto } from './dto/address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(Address)
    private readonly addressesRepository: Repository<Address>,
  ) {}

  async findAllByUser(userId: number) {
    return this.addressesRepository.find({
      where: {
        user: {
          id: userId,
        },
      },
      order: {
        is_default: 'DESC',
      },
    });
  }

  async findOne(addressId: number, userId: number) {
    const address = await this.addressesRepository.findOne({
      where: {
        id: addressId,
        user: {
          id: userId,
        },
      },
      relations: {
        user: true,
      },
    });

    if (!address) {
      throw new NotFoundException('Direccion no encontrada.');
    }

    return address;
  }

  async create(dto: CreateAddressDto, userId: number) {
    const address = await this.addressesRepository.findOne({
      where: {
        id: userId,
      },
    });

    if (!address) {
      throw new NotFoundException('Direccion no encontrada');
    }

    if (dto.is_default === true) {
      await this.addressesRepository.update(
        {
          user: {
            id: userId,
          },
        },
        {
          is_default: false,
        },
      );
    }

    const newAddress = this.addressesRepository.create(dto);
    newAddress.is_default = dto.is_default ?? false;
    return await this.addressesRepository.save(newAddress);
  }

  async update(addressId: number, userId: number, dto: UpdateAddressDto) {
    const address = await this.findOne(addressId, userId);

    if (!address) {
      throw new NotFoundException('Direccion no encontrada');
    }

    if (dto.is_default === true) {
      await this.addressesRepository.update(
        {
          user: {
            id: userId,
          },
        },
        {
          is_default: false,
        },
      );
    }

    Object.assign(address, dto);
    return this.addressesRepository.save(address);
  }

  async delete(addressId: number, userId: number) {
    const address = await this.findOne(addressId, userId);

    if (!address) {
      throw new NotFoundException('Direccion no encontrada');
    }

    return this.addressesRepository.delete(address);
  }

  async setDefault(addressId: number, userId: number) {
    const address = await this.findOne(addressId, userId);

    if (!address) {
      throw new NotFoundException('Direccion no encontrada');
    }

    return (address.is_default = true);
  }
}
