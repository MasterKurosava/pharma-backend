import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';

@Injectable()
export class OrderPrecheckService {
  constructor() {}

  async loadCreateContext(dto: CreateOrderDto, db: Prisma.TransactionClient) {
    await this.ensureStatusExists(db, dto.actionStatusCode, 'ACTION');
    await this.ensureStatusExists(db, dto.stateStatusCode, 'STATE');
    if (dto.assemblyStatusCode) {
      await this.ensureAssemblyStatusExists(db, dto.assemblyStatusCode);
    }
  }

  async loadUpdateContext(
    dto: UpdateOrderDto,
    existing: {
      actionStatusCode: string;
      stateStatusCode: string;
    },
    db: PrismaService | Prisma.TransactionClient,
  ) {
    const finalActionStatusCode = dto.actionStatusCode ?? existing.actionStatusCode;
    const finalStateStatusCode = dto.stateStatusCode ?? existing.stateStatusCode;
    await this.ensureStatusExists(db, finalActionStatusCode, 'ACTION');
    await this.ensureStatusExists(db, finalStateStatusCode, 'STATE');
    if (dto.assemblyStatusCode !== undefined && dto.assemblyStatusCode !== null) {
      await this.ensureAssemblyStatusExists(db, dto.assemblyStatusCode);
    }
  }

  private async ensureStatusExists(
    db: PrismaService | Prisma.TransactionClient,
    code: string,
    type: 'ACTION' | 'STATE',
  ) {
    const status = await db.orderStatusConfig.findFirst({
      where: { code, type, isActive: true },
      select: { id: true },
    });
    if (!status) {
      throw new NotFoundException(`Статус ${code} (${type}) не найден`);
    }
  }

  private async ensureAssemblyStatusExists(
    db: PrismaService | Prisma.TransactionClient,
    code: string,
  ) {
    const status = await db.assemblyStatus.findFirst({
      where: { code, isActive: true },
      select: { id: true },
    });
    if (!status) {
      throw new NotFoundException(`Статус сборки ${code} не найден`);
    }
  }
}

