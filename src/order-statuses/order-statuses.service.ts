import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderStatusDto } from './dto/create-order-status.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderStatusQueryDto } from './dto/order-status-query.dto';

@Injectable()
export class OrderStatusesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: OrderStatusQueryDto) {
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

    return this.prisma.orderStatus.findMany({
      where,
      orderBy: [{ name: 'asc' }],
    });
  }

  async findById(id: number) {
    const entity = await this.prisma.orderStatus.findUnique({
      where: { id },
    });

    if (!entity) {
      throw new NotFoundException('Статус заказа не найден');
    }

    return entity;
  }

  async create(dto: CreateOrderStatusDto) {
    return this.prisma.orderStatus.create({
      data: {
        name: dto.name.trim(),
        ...(dto.color !== undefined ? { color: dto.color.trim() } : {}),
      },
    });
  }

  async update(id: number, dto: UpdateOrderStatusDto) {
    await this.findById(id);

    return this.prisma.orderStatus.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.color !== undefined ? { color: dto.color.trim() } : {}),
      },
    });
  }

  async delete(id: number) {
    await this.findById(id);
    return this.prisma.orderStatus.delete({ where: { id } });
  }
}
