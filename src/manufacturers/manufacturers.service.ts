import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateManufacturerDto } from './dto/create-manufacturer.dto';
import { UpdateManufacturerDto } from './dto/update-manufacturer.dto';
import { ManufacturerQueryDto } from './dto/manufacturer-query.dto';

@Injectable()
export class ManufacturersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ManufacturerQueryDto) {
    const where = {
      ...(typeof query.isActive === 'boolean' ? { isActive: query.isActive } : {}),
      ...(query.search
        ? {
            OR: [
              {
                name: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    return this.prisma.manufacturer.findMany({
      where,
      orderBy: [{ name: 'asc' }],
    });
  }

  async findById(id: number) {
    const entity = await this.prisma.manufacturer.findUnique({
      where: { id },
    });

    if (!entity) {
      throw new NotFoundException('Производитель не найден');
    }

    return entity;
  }

  async create(dto: CreateManufacturerDto) {
    if (dto.countryId !== undefined) {
      const related = await this.prisma.country.findUnique({
        where: { id: dto.countryId },
      });

      if (!related) {
        throw new NotFoundException('Страна не найден');
      }
    }

    return this.prisma.manufacturer.create({
      data: {
        name: dto.name.trim(),
        ...(dto.countryId !== undefined ? { countryId: dto.countryId } : {}),
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: number, dto: UpdateManufacturerDto) {
    await this.findById(id);

    if (dto.countryId !== undefined) {
      const related = await this.prisma.country.findUnique({
        where: { id: dto.countryId },
      });

      if (!related) {
        throw new NotFoundException('Страна не найден');
      }
    }

    return this.prisma.manufacturer.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.countryId !== undefined ? { countryId: dto.countryId } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }
}
