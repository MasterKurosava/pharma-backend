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

    const result = await tx.product.updateMany({
      where: {
        id: params.product.id,
        stockQuantity: params.product.stockQuantity,
        reservedQuantity: {
          lte: params.product.stockQuantity - params.quantity,
        },
      },
      data: {
        reservedQuantity: {
          increment: params.quantity,
        },
      },
    });

    if (result.count === 0) {
      throw new BadRequestException(`Недостаточно остатка для товара ${params.product.name}`);
    }

    await tx.productStockMovement.create({
      data: {
        productId: params.product.id,
        orderId: params.orderId,
        createdByUserId: params.currentUserId ?? null,
        type: STOCK_MOVEMENT_TYPES.RESERVE,
        quantityDelta: params.quantity,
        beforeQuantity: params.product.reservedQuantity,
        afterQuantity: params.product.reservedQuantity + params.quantity,
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

    const current = await tx.product.findUnique({
      where: { id: params.productId },
      select: { id: true, name: true, reservedQuantity: true },
    });

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
}
