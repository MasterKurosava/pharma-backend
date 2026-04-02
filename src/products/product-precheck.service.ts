import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityExistenceService } from '../common/prechecks/entity-existence.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductAvailabilityStatus } from '@prisma/client';

@Injectable()
export class ProductPrecheckService {
  constructor(private readonly existence: EntityExistenceService) {}

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

