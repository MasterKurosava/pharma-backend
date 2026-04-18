import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EntityExistenceService } from '../common/prechecks/entity-existence.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductAvailabilityStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductPrecheckService {
  constructor(
    private readonly existence: EntityExistenceService,
    private readonly prisma: PrismaService,
  ) {}

  private async ensureActiveStoragePlace(storagePlaceId: number) {
    const place = await this.prisma.storagePlace.findFirst({
      where: { id: storagePlaceId, isActive: true },
    });
    if (!place) {
      throw new NotFoundException('Место хранения не найдено');
    }
  }

  async loadCreateContext(dto: CreateProductDto, db: any) {
    const [manufacturer, activeSubstance, orderSource] = await Promise.all([
      this.existence.getRequiredById('manufacturer', dto.manufacturerId, 'Производитель не найден', db),
      this.existence.getRequiredById(
        'activeSubstance',
        dto.activeSubstanceId,
        'Действующее вещество не найдено',
        db,
      ),
      dto.productOrderSourceId !== undefined
        ? this.existence.getRequiredById(
            'productOrderSource',
            dto.productOrderSourceId,
            'Источник заказа товара не найден',
            db,
          )
        : Promise.resolve(null),
    ]);

    if (dto.storagePlaceId !== undefined) {
      await this.ensureActiveStoragePlace(dto.storagePlaceId);
    }

    return { manufacturer, activeSubstance, orderSource };
  }

  async loadUpdateContext(dto: UpdateProductDto, db: any) {
    const checks: Promise<unknown>[] = [];

    if (dto.manufacturerId !== undefined) {
      checks.push(
        this.existence.ensureRequiredById('manufacturer', dto.manufacturerId, 'Производитель не найден', db),
      );
    }
    if (dto.activeSubstanceId !== undefined) {
      checks.push(
        this.existence.ensureRequiredById(
          'activeSubstance',
          dto.activeSubstanceId,
          'Действующее вещество не найдено',
          db,
        ),
      );
    }
    if (dto.productOrderSourceId !== undefined) {
      checks.push(
        this.existence.ensureRequiredById(
          'productOrderSource',
          dto.productOrderSourceId,
          'Источник заказа товара не найден',
          db,
        ),
      );
    }
    if (dto.storagePlaceId !== undefined && dto.storagePlaceId !== null) {
      checks.push(this.ensureActiveStoragePlace(dto.storagePlaceId));
    }

    await Promise.all(checks);
  }

  validateQuantities(stockQuantity: number, reservedQuantity: number) {
    if (reservedQuantity > stockQuantity) {
      throw new BadRequestException('Зарезервированное количество не может быть больше остатка');
    }
  }

  validateOrderSourceRules(status: ProductAvailabilityStatus, productOrderSourceId: number | undefined) {
    if (status === ProductAvailabilityStatus.ON_REQUEST && productOrderSourceId === undefined) {
      throw new BadRequestException('Источник препарата обязателен для статуса "На заказ"');
    }

    if (status !== ProductAvailabilityStatus.ON_REQUEST && productOrderSourceId !== undefined) {
      throw new BadRequestException('Источник препарата не должен быть указан, если препарат не "На заказ"');
    }
  }
}

