import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStoragePlaceDto } from './dto/create-storage-place.dto';
import { UpdateStoragePlaceDto } from './dto/update-storage-place.dto';
import { StoragePlaceQueryDto } from './dto/storage-place-query.dto';

@Injectable()
export class StoragePlacesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: StoragePlaceQueryDto) {
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

    return this.prisma.storagePlace.findMany({
      where,
      orderBy: [{ name: 'asc' }],
    });
  }

  async findById(id: number) {
    const entity = await this.prisma.storagePlace.findUnique({
      where: { id },
    });

    if (!entity) {
      throw new NotFoundException('Место хранения не найден');
    }

    return entity;
  }

  async create(dto: CreateStoragePlaceDto) {
    return this.prisma.storagePlace.create({
      data: {
        name: dto.name.trim(),
        ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: number, dto: UpdateStoragePlaceDto) {
    await this.findById(id);

    return this.prisma.storagePlace.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }
}
