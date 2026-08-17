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
    });

    if (!address) {
      throw new NotFoundException('Direccion no encontrada.');
    }

    return address;
  }

  async create(dto: CreateAddressDto, userId: number) {
    const addressCount = await this.addressesRepository.count({
      where: {
        user: {
          id: userId,
        },
      },
    });

    const isFirstAddress = addressCount === 0;

    if (dto.is_default) {
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

    const newAddress = this.addressesRepository.create({
      ...dto,
      user: {
        id: userId,
      },
      is_default: isFirstAddress || dto.is_default,
    });

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

  async remove(addressId: number, userId: number) {
    const address = await this.findOne(addressId, userId);

    if (!address) {
      throw new NotFoundException('Direccion no encontrada');
    }

    return this.addressesRepository.remove(address);
  }

  async setDefault(addressId: number, userId: number) {
    const address = await this.findOne(addressId, userId);

    if (!address) {
      throw new NotFoundException('Direccion no encontrada');
    }

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

    address.is_default = true;

    return this.addressesRepository.save(address);
  }
}
