import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductOrderSourceDto } from './dto/create-product-order-source.dto';
import { UpdateProductOrderSourceDto } from './dto/update-product-order-source.dto';
import { ProductOrderSourceQueryDto } from './dto/product-order-source-query.dto';

@Injectable()
export class ProductOrderSourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ProductOrderSourceQueryDto) {
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

    return this.prisma.productOrderSource.findMany({
      where,
      orderBy: [{ name: 'asc' }],
    });
  }

  async findById(id: number) {
    const entity = await this.prisma.productOrderSource.findUnique({
      where: { id },
    });

    if (!entity) {
      throw new NotFoundException('Источник заказа товара не найден');
    }

    return entity;
  }

  async create(dto: CreateProductOrderSourceDto) {
    return this.prisma.productOrderSource.create({
      data: {
        name: dto.name.trim(),
        ...(dto.color !== undefined ? { color: dto.color.trim() } : {}),
      },
    });
  }

  async update(id: number, dto: UpdateProductOrderSourceDto) {
    await this.findById(id);

    return this.prisma.productOrderSource.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.color !== undefined ? { color: dto.color.trim() } : {}),
      },
    });
  }

  async delete(id: number) {
    await this.findById(id);
    return this.prisma.productOrderSource.delete({ where: { id } });
  }
}
