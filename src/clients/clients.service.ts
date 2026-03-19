import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EntityExistenceService } from '../common/prechecks/entity-existence.service';
import { PrismaErrorMapperService } from '../common/prisma/prisma-error-mapper.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientQueryDto } from './dto/client-query.dto';

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly existence: EntityExistenceService,
    private readonly prismaErrorMapper: PrismaErrorMapperService,
  ) {}

  async findAll(query: ClientQueryDto) {
    if (query.clientStatusId !== undefined) {
      await this.existence.ensureRequiredById(
        'clientStatus',
        query.clientStatusId,
        'Статус клиента не найден',
      );
    }

    const where = {
      ...(query.clientStatusId !== undefined ? { clientStatusId: query.clientStatusId } : {}),
      ...(query.search
        ? {
            OR: [
              {
                name: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                phone: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    return this.prisma.client.findMany({
      where,
      orderBy: [{ name: 'asc' }],
    });
  }

  async findById(id: number) {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      throw new NotFoundException('Клиент не найден');
    }

    return client;
  }

  async create(dto: CreateClientDto) {
    const normalizedPhone = dto.phone.trim();

    const existingByPhone = await this.prisma.client.findUnique({
      where: { phone: normalizedPhone },
    });

    if (existingByPhone) {
      throw new ConflictException('Клиент с таким телефоном уже существует');
    }

    if (dto.clientStatusId !== undefined) {
      await this.existence.ensureRequiredById(
        'clientStatus',
        dto.clientStatusId,
        'Статус клиента не найден',
      );
    }

    try {
      return this.prisma.client.create({
        data: {
          name: dto.name.trim(),
          phone: normalizedPhone,
          ...(dto.clientStatusId !== undefined ? { clientStatusId: dto.clientStatusId } : {}),
          ...(dto.note !== undefined ? { note: dto.note.trim() } : {}),
        },
      });
    } catch (error) {
      this.prismaErrorMapper.rethrow(error);
    }
  }

  async update(id: number, dto: UpdateClientDto) {
    await this.findById(id);

    if (dto.phone !== undefined) {
      const normalizedPhone = dto.phone.trim();

      const existingByPhone = await this.prisma.client.findFirst({
        where: {
          phone: normalizedPhone,
          NOT: { id },
        },
      });

      if (existingByPhone) {
        throw new ConflictException('Клиент с таким телефоном уже существует');
      }
    }

    if (dto.clientStatusId !== undefined) {
      await this.existence.ensureRequiredById(
        'clientStatus',
        dto.clientStatusId,
        'Статус клиента не найден',
      );
    }

    try {
      return this.prisma.client.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone.trim() } : {}),
          ...(dto.clientStatusId !== undefined ? { clientStatusId: dto.clientStatusId } : {}),
          ...(dto.note !== undefined ? { note: dto.note.trim() } : {}),
        },
      });
    } catch (error) {
      this.prismaErrorMapper.rethrow(error);
    }
  }

  async delete(id: number) {
    await this.findById(id);

    try {
      return this.prisma.client.delete({ where: { id } });
    } catch (error) {
      this.prismaErrorMapper.rethrow(error);
    }
  }
}
