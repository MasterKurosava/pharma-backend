import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductStoragePlaceDto } from './dto/create-product-storage-place.dto';
import { UpdateProductStoragePlaceDto } from './dto/update-product-storage-place.dto';
import { ProductStoragePlaceQueryDto } from './dto/product-storage-place-query.dto';

@Injectable()
export class ProductStoragePlacesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ProductStoragePlaceQueryDto) {
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

    return this.prisma.productStoragePlace.findMany({
      where,
      orderBy: [{ name: 'asc' }],
    });
  }

  async findById(id: number) {
    const entity = await this.prisma.productStoragePlace.findFirst({
      where: { id, isActive: true },
    });

    if (!entity) {
      throw new NotFoundException('Место хранения препарата не найдено');
    }

    return entity;
  }

  async create(dto: CreateProductStoragePlaceDto) {
    return this.prisma.productStoragePlace.create({
      data: {
        name: dto.name.trim(),
        ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: number, dto: UpdateProductStoragePlaceDto) {
    await this.findById(id);

    return this.prisma.productStoragePlace.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async delete(id: number) {
    await this.findById(id);
    return this.prisma.productStoragePlace.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
