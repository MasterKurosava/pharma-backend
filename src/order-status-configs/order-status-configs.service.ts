import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatusConfigQueryDto } from './dto/order-status-config-query.dto';
import { UpdateOrderStatusConfigDto } from './dto/update-order-status-config.dto';

@Injectable()
export class OrderStatusConfigsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: OrderStatusConfigQueryDto) {
    return this.prisma.orderStatusConfig.findMany({
      where: {
        isActive: true,
        ...(query.type ? { type: query.type } : {}),
        ...(query.search
          ? {
              OR: [
                { code: { contains: query.search, mode: 'insensitive' } },
                { name: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findById(id: number) {
    const status = await this.prisma.orderStatusConfig.findUnique({ where: { id } });
    if (!status) {
      throw new NotFoundException('Конфигурация статуса не найдена');
    }
    return status;
  }

  async update(id: number, dto: UpdateOrderStatusConfigDto) {
    await this.findById(id);
    return this.prisma.orderStatusConfig.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.color !== undefined ? { color: dto.color?.trim() || null } : {}),
        ...(dto.tableGroup !== undefined ? { tableGroup: dto.tableGroup } : {}),
        ...(dto.reserveOnSet !== undefined ? { reserveOnSet: dto.reserveOnSet } : {}),
        ...(dto.writeOffOnSet !== undefined ? { writeOffOnSet: dto.writeOffOnSet } : {}),
        ...(dto.setAssemblyDateOnSet !== undefined
          ? { setAssemblyDateOnSet: dto.setAssemblyDateOnSet }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
  }
}
