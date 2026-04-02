import { BadRequestException, Injectable } from '@nestjs/common';
import { DeliveryStatusCode, OrderStatusCode, Prisma } from '@prisma/client';
import { EntityExistenceService } from '../../common/prechecks/entity-existence.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';

@Injectable()
export class OrderPrecheckService {
  constructor(private readonly existence: EntityExistenceService) {}

  async loadCreateContext(dto: CreateOrderDto, db: Prisma.TransactionClient) {
    await this.existence.ensureRequiredById('country', dto.countryId, 'Страна не найдена', db);

    this.validateDeliveryForOrderStatus(dto.orderStatus, dto.deliveryStatus);
  }

  async loadUpdateContext(
    dto: UpdateOrderDto,
    existing: {
      countryId: number;
      orderStatus: OrderStatusCode;
      deliveryStatus: DeliveryStatusCode;
    },
    db: PrismaService | Prisma.TransactionClient,
  ) {
    const finalCountryId = dto.countryId ?? existing.countryId;
    await this.existence.ensureRequiredById('country', finalCountryId, 'Страна не найдена', db);

    const finalOrderStatus = dto.orderStatus ?? existing.orderStatus;
    const finalDeliveryStatus = dto.deliveryStatus ?? existing.deliveryStatus;
    this.validateDeliveryForOrderStatus(finalOrderStatus, finalDeliveryStatus);

  }

  private validateDeliveryForOrderStatus(orderStatus: OrderStatusCode, deliveryStatus: DeliveryStatusCode) {
    if (orderStatus !== OrderStatusCode.ASSEMBLY_REQUIRED) return;

    // deliveryStatus is required for "Требует сборки" and is limited by enum values.
    if (!deliveryStatus) {
      throw new BadRequestException(
        'Для статуса "Требует сборки" обязательно выбрать направление сборки (ДоВас/Пони/Яндекс/Самовывоз)',
      );
    }
  }
}

