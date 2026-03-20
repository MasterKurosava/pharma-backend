import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentStatusDto } from './dto/create-payment-status.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { PaymentStatusQueryDto } from './dto/payment-status-query.dto';

@Injectable()
export class PaymentStatusesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaymentStatusQueryDto) {
    const where = {
      deletedAt: null,
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

    return this.prisma.paymentStatus.findMany({
      where,
      orderBy: [{ name: 'asc' }],
    });
  }

  async findById(id: number) {
    const entity = await this.prisma.paymentStatus.findFirst({
      where: { id, deletedAt: null },
    });

    if (!entity) {
      throw new NotFoundException('Статус оплаты не найден');
    }

    return entity;
  }

  async create(dto: CreatePaymentStatusDto) {
    return this.prisma.paymentStatus.create({
      data: {
        name: dto.name.trim(),
        ...(dto.color !== undefined ? { color: dto.color.trim() } : {}),
      },
    });
  }

  async update(id: number, dto: UpdatePaymentStatusDto) {
    await this.findById(id);

    return this.prisma.paymentStatus.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.color !== undefined ? { color: dto.color.trim() } : {}),
      },
    });
  }

  async delete(id: number) {
    await this.findById(id);
    return this.prisma.paymentStatus.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
