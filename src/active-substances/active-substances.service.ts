import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActiveSubstanceDto } from './dto/create-active-substance.dto';
import { UpdateActiveSubstanceDto } from './dto/update-active-substance.dto';
import { ActiveSubstanceQueryDto } from './dto/active-substance-query.dto';

@Injectable()
export class ActiveSubstancesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ActiveSubstanceQueryDto) {
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

    const items = await this.prisma.activeSubstance.findMany({
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
      const total = await this.prisma.activeSubstance.count({ where });
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
    const entity = await this.prisma.activeSubstance.findUnique({
      where: { id },
    });

    if (!entity) {
      throw new NotFoundException('Действующее вещество не найден');
    }

    return entity;
  }

  async create(dto: CreateActiveSubstanceDto) {
    return this.prisma.activeSubstance.create({
      data: {
        name: dto.name.trim(),
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: number, dto: UpdateActiveSubstanceDto) {
    await this.findById(id);

    return this.prisma.activeSubstance.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async delete(id: number) {
    await this.findById(id);
    return this.prisma.activeSubstance.delete({ where: { id } });
  }
}
