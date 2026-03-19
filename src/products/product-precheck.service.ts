import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityExistenceService } from '../common/prechecks/entity-existence.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductPrecheckService {
  constructor(private readonly existence: EntityExistenceService) {}

  async loadCreateContext(dto: CreateProductDto, db: any) {
    const [manufacturer, activeSubstance, productStatus, orderSource] = await Promise.all([
      this.existence.getRequiredById('manufacturer', dto.manufacturerId, 'Производитель не найден', db),
      this.existence.getRequiredById(
        'activeSubstance',
        dto.activeSubstanceId,
        'Действующее вещество не найдено',
        db,
      ),
      this.existence.getRequiredById('productStatus', dto.productStatusId, 'Статус товара не найден', db),
      dto.productOrderSourceId !== undefined
        ? this.existence.getRequiredById(
            'productOrderSource',
            dto.productOrderSourceId,
            'Источник заказа товара не найден',
            db,
          )
        : Promise.resolve(null),
    ]);

    return { manufacturer, activeSubstance, productStatus, orderSource };
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
    if (dto.productStatusId !== undefined) {
      checks.push(
        this.existence.ensureRequiredById('productStatus', dto.productStatusId, 'Статус товара не найден', db),
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
}

