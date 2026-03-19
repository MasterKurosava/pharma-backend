import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductStatusDto } from './dto/create-product-status.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { ProductStatusQueryDto } from './dto/product-status-query.dto';

@Injectable()
export class ProductStatusesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ProductStatusQueryDto) {
    const where = {
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

    return this.prisma.productStatus.findMany({
      where,
      orderBy: [{ name: 'asc' }],
    });
  }

  async findById(id: number) {
    const entity = await this.prisma.productStatus.findUnique({
      where: { id },
    });

    if (!entity) {
      throw new NotFoundException('Статус товара не найден');
    }

    return entity;
  }

  async create(dto: CreateProductStatusDto) {
    return this.prisma.productStatus.create({
      data: {
        name: dto.name.trim(),
        ...(dto.color !== undefined ? { color: dto.color.trim() } : {}),
      },
    });
  }

  async update(id: number, dto: UpdateProductStatusDto) {
    await this.findById(id);

    return this.prisma.productStatus.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.color !== undefined ? { color: dto.color.trim() } : {}),
      },
    });
  }

  async delete(id: number) {
    await this.findById(id);
    return this.prisma.productStatus.delete({ where: { id } });
  }
}
