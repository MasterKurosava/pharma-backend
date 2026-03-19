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

    return this.prisma.activeSubstance.findMany({
      where,
      orderBy: [{ name: 'asc' }],
    });
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
}
