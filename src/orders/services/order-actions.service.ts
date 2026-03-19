import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaErrorMapperService } from '../../common/prisma/prisma-error-mapper.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ORDER_STATUS_CODES } from '../constants/order-lifecycle.constants';
import { ORDER_FULL_INCLUDE } from '../order.constants';
import { UpdateOrderPaymentDto } from '../dto/actions/update-order-payment.dto';
import { OrderHistoryService } from './order-history.service';
import { OrderInventoryService } from './order-inventory.service';

type OrderFull = Prisma.OrderGetPayload<{ include: typeof ORDER_FULL_INCLUDE }>;

@Injectable()
export class OrderActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly history: OrderHistoryService,
    private readonly inventory: OrderInventoryService,
    private readonly prismaErrorMapper: PrismaErrorMapperService,
  ) {}

  async cancel(orderId: number, currentUserId: number) {
    return this.prisma
      .$transaction(async (tx) => {
        const order = await this.loadOrderOrThrow(tx, orderId);
        this.assertCanCancel(order);

        for (const item of order.items) {
          await this.inventory.release(tx, {
            productId: item.productId,
            quantity: item.quantity,
            orderId,
            currentUserId,
            productName: item.productNameSnapshot,
          });
        }

        const cancelledStatus = await this.resolveCancelledStatus(tx);
        await tx.order.update({
          where: { id: orderId },
          data: {
            orderStatusId: cancelledStatus.id,
          },
        });

        const updated = await this.loadOrderOrThrow(tx, orderId);
        await this.history.logOrderCancelled(tx, orderId, currentUserId, {
          previousStatus: order.orderStatus.name,
          newStatus: updated.orderStatus.name,
          releasedItemsCount: order.items.length,
        });

        return updated;
      }, { timeout: 15000 })
      .catch((error) => this.prismaErrorMapper.rethrow(error));
  }

  async close(orderId: number, currentUserId: number) {
    return this.prisma
      .$transaction(async (tx) => {
        const order = await this.loadOrderOrThrow(tx, orderId);
        this.assertCanClose(order);

        if (!order.items.length) {
          throw new BadRequestException('Нельзя закрыть пустой заказ');
        }

        const closedStatus = await this.resolveClosedStatus(tx);
        await tx.order.update({
          where: { id: orderId },
          data: {
            orderStatusId: closedStatus.id,
          },
        });

        const updated = await this.loadOrderOrThrow(tx, orderId);
        await this.history.logOrderClosed(tx, orderId, currentUserId, {
          previousStatus: order.orderStatus.name,
          newStatus: updated.orderStatus.name,
          // TODO: future stock write-off can be triggered from this operation.
        });

        return updated;
      }, { timeout: 15000 })
      .catch((error) => this.prismaErrorMapper.rethrow(error));
  }

  async changeOrderStatus(orderId: number, orderStatusId: number, currentUserId: number) {
    return this.changeFieldAction(orderId, currentUserId, {
      fieldName: 'orderStatusId',
      updateData: { orderStatusId },
      message: 'Изменён статус заказа',
      loadReference: async (db) => db.orderStatus.findUnique({ where: { id: orderStatusId } }),
    });
  }

  async changePaymentStatus(orderId: number, paymentStatusId: number, currentUserId: number) {
    return this.changeFieldAction(orderId, currentUserId, {
      fieldName: 'paymentStatusId',
      updateData: { paymentStatusId },
      message: 'Изменён статус оплаты',
      loadReference: async (db) => db.paymentStatus.findUnique({ where: { id: paymentStatusId } }),
    });
  }

  async changeAssemblyStatus(orderId: number, assemblyStatusId: number, currentUserId: number) {
    return this.changeFieldAction(orderId, currentUserId, {
      fieldName: 'assemblyStatusId',
      updateData: { assemblyStatusId },
      message: 'Изменён статус сборки',
      loadReference: async (db) => db.assemblyStatus.findUnique({ where: { id: assemblyStatusId } }),
    });
  }

  async assignResponsible(orderId: number, responsibleUserId: number, currentUserId: number) {
    return this.changeFieldAction(orderId, currentUserId, {
      fieldName: 'responsibleUserId',
      updateData: { responsibleUserId },
      message: 'Изменён ответственный',
      loadReference: async (db) => db.user.findUnique({ where: { id: responsibleUserId } }),
    });
  }

  async changeStoragePlace(orderId: number, storagePlaceId: number, currentUserId: number) {
    return this.changeFieldAction(orderId, currentUserId, {
      fieldName: 'storagePlaceId',
      updateData: { storagePlaceId },
      message: 'Изменено место хранения',
      loadReference: async (db) => db.storagePlace.findUnique({ where: { id: storagePlaceId } }),
    });
  }

  async updatePayment(orderId: number, dto: UpdateOrderPaymentDto, currentUserId: number) {
    return this.prisma
      .$transaction(async (tx) => {
        const order = await this.loadOrderOrThrow(tx, orderId);
        this.assertCanEditOrder(order);

        const nextPaidAmount = this.toMoney(dto.paidAmount);
        const totalPrice = this.toMoney(order.totalPrice);
        if (nextPaidAmount.isNegative()) {
          throw new BadRequestException('Сумма оплаты не может быть отрицательной');
        }
        if (nextPaidAmount.greaterThan(totalPrice)) {
          throw new BadRequestException('Сумма оплаты не может быть больше суммы заказа');
        }

        const remainingAmount = totalPrice.minus(nextPaidAmount);
        const updateData: Prisma.OrderUpdateInput = {
          paidAmount: nextPaidAmount.toFixed(2),
          remainingAmount: remainingAmount.toFixed(2),
          ...(dto.paymentStatusId !== undefined ? { paymentStatusId: dto.paymentStatusId } : {}),
        };

        await tx.order.update({ where: { id: orderId }, data: updateData });
        const updated = await this.loadOrderOrThrow(tx, orderId);

        await this.history.logOrderPaymentUpdated(tx, orderId, currentUserId, {
          oldPaidAmount: order.paidAmount.toString(),
          newPaidAmount: updated.paidAmount.toString(),
          oldRemainingAmount: order.remainingAmount.toString(),
          newRemainingAmount: updated.remainingAmount.toString(),
          oldPaymentStatus: order.paymentStatus.name,
          newPaymentStatus: updated.paymentStatus.name,
        });

        return updated;
      }, { timeout: 15000 })
      .catch((error) => this.prismaErrorMapper.rethrow(error));
  }

  private async changeFieldAction(
    orderId: number,
    currentUserId: number,
    input: {
      fieldName: string;
      updateData: Prisma.OrderUncheckedUpdateInput;
      message: string;
      loadReference: (db: Prisma.TransactionClient) => Promise<{ id: number } | null>;
    },
  ) {
    return this.prisma
      .$transaction(async (tx) => {
        const order = await this.loadOrderOrThrow(tx, orderId);
        this.assertCanEditOrder(order);

        const reference = await input.loadReference(tx);
        if (!reference) {
          throw new NotFoundException('Связанная сущность не найдена');
        }

        await tx.order.update({
          where: { id: orderId },
          data: input.updateData,
        });

        const updated = await this.loadOrderOrThrow(tx, orderId);
        await this.history.logOrderAction(tx, orderId, currentUserId, input.message, {
          fieldName: input.fieldName,
          from: (order as Record<string, unknown>)[input.fieldName],
          to: (updated as Record<string, unknown>)[input.fieldName],
        });
        return updated;
      }, { timeout: 15000 })
      .catch((error) => this.prismaErrorMapper.rethrow(error));
  }

  private async resolveCancelledStatus(tx: Prisma.TransactionClient) {
    const status = await tx.orderStatus.findFirst({
      where: {
        OR: [{ code: ORDER_STATUS_CODES.CANCELLED }, { name: { contains: 'отмен', mode: 'insensitive' } }],
      },
    });
    if (!status) {
      throw new BadRequestException('Не найден статус для отмены заказа');
    }
    return status;
  }

  private async resolveClosedStatus(tx: Prisma.TransactionClient) {
    const status = await tx.orderStatus.findFirst({
      where: {
        OR: [{ code: ORDER_STATUS_CODES.CLOSED }, { name: { contains: 'закры', mode: 'insensitive' } }],
      },
    });
    if (!status) {
      throw new BadRequestException('Не найден статус для закрытия заказа');
    }
    return status;
  }

  private assertCanEditOrder(order: OrderFull) {
    const code = (order.orderStatus.code ?? '').toUpperCase();
    if ([ORDER_STATUS_CODES.CANCELLED, ORDER_STATUS_CODES.CLOSED].includes(code as any)) {
      throw new BadRequestException('Заказ в финальном статусе и недоступен для редактирования');
    }
  }

  private assertCanCancel(order: OrderFull) {
    const statusCode = (order.orderStatus.code ?? '').toUpperCase();
    if (statusCode === ORDER_STATUS_CODES.CANCELLED) {
      throw new BadRequestException('Заказ уже отменён');
    }
    if (statusCode === ORDER_STATUS_CODES.CLOSED) {
      throw new BadRequestException('Закрытый заказ нельзя отменить');
    }
  }

  private assertCanClose(order: OrderFull) {
    const statusCode = (order.orderStatus.code ?? '').toUpperCase();
    if (statusCode === ORDER_STATUS_CODES.CANCELLED) {
      throw new BadRequestException('Отменённый заказ нельзя закрыть');
    }
    if (statusCode === ORDER_STATUS_CODES.CLOSED) {
      throw new BadRequestException('Заказ уже закрыт');
    }
  }

  private async loadOrderOrThrow(db: PrismaService | Prisma.TransactionClient, orderId: number) {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: ORDER_FULL_INCLUDE,
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    return order;
  }

  private toMoney(value: Prisma.Decimal | Decimal | number | string) {
    return new Decimal(value as Decimal.Value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }
}
