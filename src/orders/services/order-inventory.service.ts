import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { STOCK_MOVEMENT_TYPES } from '../constants/stock-movement-types';

type ProductSnapshot = {
  id: number;
  name: string;
  stockQuantity: number;
  reservedQuantity: number;
};

@Injectable()
export class OrderInventoryService {
  private async getProductSnapshot(tx: Prisma.TransactionClient, productId: number) {
    return tx.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, stockQuantity: true, reservedQuantity: true },
    });
  }

  async reserve(
    tx: Prisma.TransactionClient,
    params: {
      product: ProductSnapshot;
      quantity: number;
      orderId?: number;
      currentUserId?: number;
    },
  ) {
    if (params.quantity <= 0) {
      throw new BadRequestException('Количество резерва должно быть больше нуля');
    }

    const latest = await this.getProductSnapshot(tx, params.product.id);
    if (!latest) {
      throw new BadRequestException('Товар не найден');
    }
    const available = latest.stockQuantity - latest.reservedQuantity;
    if (available < params.quantity) {
      throw new BadRequestException(
        `Недостаточно доступного количества для товара "${latest.name}". Доступно: ${available}, в резерве: ${latest.reservedQuantity}, запрошено: ${params.quantity}.`,
      );
    }
    await tx.product.update({
      where: { id: params.product.id },
      data: { reservedQuantity: { increment: params.quantity } },
    });

    await tx.productStockMovement.create({
      data: {
        productId: params.product.id,
        orderId: params.orderId,
        createdByUserId: params.currentUserId ?? null,
        type: STOCK_MOVEMENT_TYPES.RESERVE,
        quantityDelta: params.quantity,
        beforeQuantity: latest.reservedQuantity,
        afterQuantity: latest.reservedQuantity + params.quantity,
      },
    });
  }

  async release(
    tx: Prisma.TransactionClient,
    params: {
      productId: number;
      quantity: number;
      orderId?: number;
      currentUserId?: number;
      productName?: string;
    },
  ) {
    if (params.quantity <= 0) {
      throw new BadRequestException('Количество снятия резерва должно быть больше нуля');
    }

    const current = await this.getProductSnapshot(tx, params.productId);

    if (!current || current.reservedQuantity < params.quantity) {
      throw new BadRequestException(
        `Некорректное уменьшение резерва товара ${params.productName ?? current?.name ?? ''}`.trim(),
      );
    }

    await tx.product.update({
      where: { id: params.productId },
      data: {
        reservedQuantity: {
          decrement: params.quantity,
        },
      },
    });

    await tx.productStockMovement.create({
      data: {
        productId: params.productId,
        orderId: params.orderId,
        createdByUserId: params.currentUserId ?? null,
        type: STOCK_MOVEMENT_TYPES.RELEASE,
        quantityDelta: -params.quantity,
        beforeQuantity: current.reservedQuantity,
        afterQuantity: current.reservedQuantity - params.quantity,
      },
    });
  }

  async writeOff(
    tx: Prisma.TransactionClient,
    params: {
      productId: number;
      quantity: number;
      orderId?: number;
      currentUserId?: number;
    },
  ) {
    if (params.quantity <= 0) {
      throw new BadRequestException('Количество списания должно быть больше нуля');
    }
    const current = await this.getProductSnapshot(tx, params.productId);
    if (!current) {
      throw new BadRequestException('Товар не найден');
    }
    if (current.stockQuantity < params.quantity) {
      throw new BadRequestException(
        `Недостаточно товара для списания "${current.name}". На складе: ${current.stockQuantity}, запрошено: ${params.quantity}.`,
      );
    }
    await tx.product.update({
      where: { id: params.productId },
      data: {
        stockQuantity: { decrement: params.quantity },
        reservedQuantity: {
          decrement: Math.min(current.reservedQuantity, params.quantity),
        },
      },
    });
    await tx.productStockMovement.create({
      data: {
        productId: params.productId,
        orderId: params.orderId,
        createdByUserId: params.currentUserId ?? null,
        type: STOCK_MOVEMENT_TYPES.WRITE_OFF,
        quantityDelta: -params.quantity,
        beforeQuantity: current.stockQuantity,
        afterQuantity: current.stockQuantity - params.quantity,
      },
    });
  }
}
