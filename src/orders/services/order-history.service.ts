import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ORDER_EVENT_TYPES } from '../constants/order-event-types';
import { DbClient } from '../order.constants';

@Injectable()
export class OrderHistoryService {
  async logOrderCreated(
    tx: DbClient,
    orderId: number,
    currentUserId: number,
    payload?: Record<string, unknown>,
  ) {
    return tx.orderEvent.create({
      data: {
        orderId,
        createdByUserId: currentUserId,
        eventType: ORDER_EVENT_TYPES.ORDER_CREATED,
        message: 'Заказ создан',
        payloadJson: (payload as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
      },
    });
  }

  async logOrderFieldChanges(tx: DbClient, events: Prisma.OrderEventCreateManyInput[]) {
    if (!events.length) {
      return;
    }

    await tx.orderEvent.createMany({ data: events });
  }

  async logOrderAction(
    tx: DbClient,
    orderId: number,
    currentUserId: number,
    message: string,
    payload?: Record<string, unknown>,
  ) {
    return tx.orderEvent.create({
      data: {
        orderId,
        createdByUserId: currentUserId,
        eventType: ORDER_EVENT_TYPES.ORDER_ACTION_EXECUTED,
        message,
        payloadJson: (payload as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
      },
    });
  }
}

