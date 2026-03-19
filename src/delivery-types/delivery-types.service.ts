import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeliveryTypeDto } from './dto/create-delivery-type.dto';
import { UpdateDeliveryTypeDto } from './dto/update-delivery-type.dto';
import { DeliveryTypeQueryDto } from './dto/delivery-type-query.dto';

@Injectable()
export class DeliveryTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: DeliveryTypeQueryDto) {
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

    return this.prisma.deliveryType.findMany({
      where,
      orderBy: [{ name: 'asc' }],
    });
  }

  async findById(id: number) {
    const entity = await this.prisma.deliveryType.findUnique({
      where: { id },
    });

    if (!entity) {
      throw new NotFoundException('Тип доставки не найден');
    }

    return entity;
  }

  async create(dto: CreateDeliveryTypeDto) {
    const related = await this.prisma.deliveryCompany.findUnique({
      where: { id: dto.deliveryCompanyId },
    });

    if (!related) {
      throw new NotFoundException('Служба доставки не найден');
    }

    return this.prisma.deliveryType.create({
      data: {
        name: dto.name.trim(),
        deliveryCompanyId: dto.deliveryCompanyId,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: number, dto: UpdateDeliveryTypeDto) {
    await this.findById(id);

    if (dto.deliveryCompanyId !== undefined) {
      const related = await this.prisma.deliveryCompany.findUnique({
        where: { id: dto.deliveryCompanyId },
      });

      if (!related) {
        throw new NotFoundException('Служба доставки не найден');
      }
    }

    return this.prisma.deliveryType.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.deliveryCompanyId !== undefined ? { deliveryCompanyId: dto.deliveryCompanyId } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async delete(id: number) {
    await this.findById(id);
    return this.prisma.deliveryType.delete({ where: { id } });
  }
}
