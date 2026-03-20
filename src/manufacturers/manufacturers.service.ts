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
      isActive: true,
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

    const items = await this.prisma.manufacturer.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      ...(query.page !== undefined || query.pageSize !== undefined
        ? {
            skip: ((query.page ?? 1) - 1) * (query.pageSize ?? 20),
            take: query.pageSize ?? 20,
          }
        : {}),
    });

    if (query.page !== undefined || query.pageSize !== undefined) {
      const total = await this.prisma.manufacturer.count({ where });
      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 20;
      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      };
    }

    return items;
  }

  async findById(id: number) {
    const entity = await this.prisma.manufacturer.findFirst({
      where: { id, isActive: true },
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

  async delete(id: number) {
    await this.findById(id);
    return this.prisma.manufacturer.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
