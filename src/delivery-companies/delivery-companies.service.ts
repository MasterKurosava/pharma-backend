import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeliveryCompanyDto } from './dto/create-delivery-company.dto';
import { UpdateDeliveryCompanyDto } from './dto/update-delivery-company.dto';
import { DeliveryCompanyQueryDto } from './dto/delivery-company-query.dto';

@Injectable()
export class DeliveryCompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: DeliveryCompanyQueryDto) {
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

    return this.prisma.deliveryCompany.findMany({
      where,
      orderBy: [{ name: 'asc' }],
    });
  }

  async findById(id: number) {
    const entity = await this.prisma.deliveryCompany.findFirst({
      where: { id, isActive: true },
    });

    if (!entity) {
      throw new NotFoundException('Служба доставки не найден');
    }

    return entity;
  }

  async create(dto: CreateDeliveryCompanyDto) {
    return this.prisma.deliveryCompany.create({
      data: {
        name: dto.name.trim(),
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: number, dto: UpdateDeliveryCompanyDto) {
    await this.findById(id);

    return this.prisma.deliveryCompany.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async delete(id: number) {
    await this.findById(id);
    return this.prisma.deliveryCompany.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
