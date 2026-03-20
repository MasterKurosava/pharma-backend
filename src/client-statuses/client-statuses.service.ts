import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientStatusDto } from './dto/create-client-status.dto';
import { UpdateClientStatusDto } from './dto/update-client-status.dto';
import { ClientStatusQueryDto } from './dto/client-status-query.dto';

@Injectable()
export class ClientStatusesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ClientStatusQueryDto) {
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

    return this.prisma.clientStatus.findMany({
      where,
      orderBy: [{ name: 'asc' }],
    });
  }

  async findById(id: number) {
    const entity = await this.prisma.clientStatus.findFirst({
      where: { id, deletedAt: null },
    });

    if (!entity) {
      throw new NotFoundException('Статус клиента не найден');
    }

    return entity;
  }

  async create(dto: CreateClientStatusDto) {
    return this.prisma.clientStatus.create({
      data: {
        name: dto.name.trim(),
        ...(dto.color !== undefined ? { color: dto.color.trim() } : {}),
      },
    });
  }

  async update(id: number, dto: UpdateClientStatusDto) {
    await this.findById(id);

    return this.prisma.clientStatus.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.color !== undefined ? { color: dto.color.trim() } : {}),
      },
    });
  }

  async delete(id: number) {
    await this.findById(id);
    return this.prisma.clientStatus.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
