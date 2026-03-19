import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssemblyStatusDto } from './dto/create-assembly-status.dto';
import { UpdateAssemblyStatusDto } from './dto/update-assembly-status.dto';
import { AssemblyStatusQueryDto } from './dto/assembly-status-query.dto';

@Injectable()
export class AssemblyStatusesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: AssemblyStatusQueryDto) {
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

    return this.prisma.assemblyStatus.findMany({
      where,
      orderBy: [{ name: 'asc' }],
    });
  }

  async findById(id: number) {
    const entity = await this.prisma.assemblyStatus.findUnique({
      where: { id },
    });

    if (!entity) {
      throw new NotFoundException('Статус сборки не найден');
    }

    return entity;
  }

  async create(dto: CreateAssemblyStatusDto) {
    return this.prisma.assemblyStatus.create({
      data: {
        name: dto.name.trim(),
        ...(dto.color !== undefined ? { color: dto.color.trim() } : {}),
      },
    });
  }

  async update(id: number, dto: UpdateAssemblyStatusDto) {
    await this.findById(id);

    return this.prisma.assemblyStatus.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.color !== undefined ? { color: dto.color.trim() } : {}),
      },
    });
  }
}
