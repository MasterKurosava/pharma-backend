import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EntityExistenceService } from '../../common/prechecks/entity-existence.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';

@Injectable()
export class OrderPrecheckService {
  constructor(private readonly existence: EntityExistenceService) {}

  async loadCreateContext(dto: CreateOrderDto, db: Prisma.TransactionClient) {
    const [client, city, deliveryType] = await Promise.all([
      this.existence.getRequiredById<{ name: string; phone: string }>(
        'client',
        dto.clientId,
        'Клиент не найден',
        db,
        { id: true, name: true, phone: true },
      ),
      this.existence.getRequiredById<{ countryId: number }>('city', dto.cityId, 'Город не найден', db, {
        id: true,
        countryId: true,
      }),
      dto.deliveryTypeId !== undefined
        ? this.existence.getRequiredById<{ deliveryCompanyId: number }>(
            'deliveryType',
            dto.deliveryTypeId,
            'Тип доставки не найден',
            db,
            { id: true, deliveryCompanyId: true },
          )
        : Promise.resolve(null),
    ]);

    if (city.countryId !== dto.countryId) {
      throw new BadRequestException('Город не принадлежит выбранной стране');
    }

    if (
      dto.deliveryCompanyId !== undefined &&
      deliveryType &&
      deliveryType.deliveryCompanyId !== dto.deliveryCompanyId
    ) {
      throw new BadRequestException('Тип доставки не принадлежит выбранной службе доставки');
    }

    return {
      client,
      city,
      deliveryType,
    };
  }

  async loadUpdateContext(
    dto: UpdateOrderDto,
    existing: { deliveryTypeId: number | null; deliveryCompanyId: number | null },
    db: PrismaService | Prisma.TransactionClient,
  ) {
    const finalDeliveryTypeId = dto.deliveryTypeId !== undefined ? dto.deliveryTypeId : existing.deliveryTypeId;
    const finalDeliveryCompanyId =
      dto.deliveryCompanyId !== undefined ? dto.deliveryCompanyId : existing.deliveryCompanyId;

    const deliveryType =
      finalDeliveryTypeId !== undefined && finalDeliveryTypeId !== null
        ? await this.existence.getRequiredById<{ deliveryCompanyId: number }>(
            'deliveryType',
            finalDeliveryTypeId,
            'Тип доставки не найден',
            db,
            { id: true, deliveryCompanyId: true },
          )
        : null;

    if (
      deliveryType &&
      finalDeliveryCompanyId !== undefined &&
      finalDeliveryCompanyId !== null &&
      deliveryType.deliveryCompanyId !== finalDeliveryCompanyId
    ) {
      throw new BadRequestException('Тип доставки не принадлежит выбранной службе доставки');
    }
  }
}

