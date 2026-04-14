import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderTableGroup, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.role.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async create(dto: CreateRoleDto) {
    try {
      return await this.prisma.role.create({
        data: {
          name: dto.name.trim(),
          code: dto.code.trim().toLowerCase(),
          isSystem: false,
          allowedRoutes: this.normalizeRoutes(dto.allowedRoutes),
          allowedOrderTableGroups: this.normalizeTableGroups(dto.allowedOrderTableGroups),
        },
      });
    } catch (error) {
      this.rethrowConstraintError(error);
    }
  }

  async update(id: number, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException('Роль не найдена');
    }

    try {
      return await this.prisma.role.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.allowedRoutes !== undefined
            ? { allowedRoutes: this.normalizeRoutes(dto.allowedRoutes) }
            : {}),
          ...(dto.allowedOrderTableGroups !== undefined
            ? {
                allowedOrderTableGroups: this.normalizeTableGroups(
                  dto.allowedOrderTableGroups,
                ),
              }
            : {}),
        },
      });
    } catch (error) {
      this.rethrowConstraintError(error);
    }
  }

  async delete(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!role) {
      throw new NotFoundException('Роль не найдена');
    }
    if (role.isSystem) {
      throw new BadRequestException('Системную роль удалить нельзя');
    }
    if (role._count.users > 0) {
      throw new BadRequestException('Нельзя удалить роль, которая назначена пользователям');
    }

    await this.prisma.role.delete({ where: { id } });
    return { success: true };
  }

  private normalizeRoutes(routes: string[]) {
    const normalized = Array.from(
      new Set(
        routes
          .map((route) => route.trim())
          .filter(Boolean),
      ),
    );
    if (normalized.length === 0) {
      throw new BadRequestException('Должна быть выбрана хотя бы одна страница');
    }
    for (const route of normalized) {
      if (route !== '*' && !route.startsWith('/')) {
        throw new BadRequestException(`Некорректный маршрут: ${route}`);
      }
    }
    return normalized;
  }

  private normalizeTableGroups(groups: OrderTableGroup[]) {
    const normalized = Array.from(
      new Set(groups.map((group) => group.trim()).filter(Boolean)),
    ) as OrderTableGroup[];
    if (normalized.length === 0) {
      throw new BadRequestException('Должна быть выбрана хотя бы одна таблица заказов');
    }
    return normalized;
  }

  private rethrowConstraintError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new BadRequestException('Роль с таким именем или кодом уже существует');
    }
    throw error;
  }
}