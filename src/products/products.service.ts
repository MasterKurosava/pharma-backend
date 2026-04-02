import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductAvailabilityStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaErrorMapperService } from '../common/prisma/prisma-error-mapper.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { ProductPrecheckService } from './product-precheck.service';
import { PRODUCT_AVAILABILITY_LABELS } from './constants/product-status.constants';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly precheck: ProductPrecheckService,
    private readonly prismaErrorMapper: PrismaErrorMapperService,
  ) {}

  async findAll(query: ProductQueryDto) {
    const where = {
      isActive: true,
      ...(query.manufacturerId !== undefined ? { manufacturerId: query.manufacturerId } : {}),
      ...(query.activeSubstanceId !== undefined ? { activeSubstanceId: query.activeSubstanceId } : {}),
      ...(query.availabilityStatus !== undefined ? { availabilityStatus: query.availabilityStatus } : {}),
      ...(query.productOrderSourceId !== undefined
        ? { productOrderSourceId: query.productOrderSourceId }
        : {}),
      ...(query.search
        ? {
            OR: [
              {
                name: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const products = await this.prisma.product.findMany({
      where,
      include: {
        manufacturer: true,
        activeSubstance: true,
        orderSource: true,
      },
      orderBy: [{ name: 'asc' }],
      ...(query.page !== undefined || query.pageSize !== undefined
        ? {
            skip: ((query.page ?? 1) - 1) * (query.pageSize ?? 20),
            take: query.pageSize ?? 20,
          }
        : {}),
    });

    const mapped = products.map((product) => this.mapProduct(product));
    if (query.page !== undefined || query.pageSize !== undefined) {
      const total = await this.prisma.product.count({ where });
      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 20;
      return {
        items: mapped,
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      };
    }

    return mapped;
  }

  async findById(id: number) {
    const product = await this.prisma.product.findFirst({
      where: { id, isActive: true },
      include: {
        manufacturer: true,
        activeSubstance: true,
        orderSource: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Товар не найден');
    }

    return this.mapProduct(product);
  }

  async create(dto: CreateProductDto) {
    await this.precheck.loadCreateContext(dto, this.prisma);
    this.precheck.validateOrderSourceRules(dto.availabilityStatus, dto.productOrderSourceId);
    this.precheck.validateQuantities(dto.stockQuantity, dto.reservedQuantity);

    try {
      const product = await this.prisma.product.create({
        data: {
          name: dto.name.trim(),
          ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
          ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl.trim() } : {}),
          manufacturerId: dto.manufacturerId,
          activeSubstanceId: dto.activeSubstanceId,
          availabilityStatus: dto.availabilityStatus,
          ...(dto.productOrderSourceId !== undefined ? { productOrderSourceId: dto.productOrderSourceId } : { productOrderSourceId: null }),
          stockQuantity: dto.stockQuantity,
          reservedQuantity: dto.reservedQuantity,
          price: dto.price,
          isActive: dto.isActive ?? true,
        },
        include: {
          manufacturer: true,
          activeSubstance: true,
          orderSource: true,
        },
      });

      return this.mapProduct(product);
    } catch (error) {
      this.prismaErrorMapper.rethrow(error);
    }
  }

  async update(id: number, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      include: {
        manufacturer: true,
        activeSubstance: true,
        orderSource: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Товар не найден');
    }

    await this.precheck.loadUpdateContext(dto, this.prisma);

    const finalStatus = dto.availabilityStatus ?? existing.availabilityStatus;

    const finalOrderSourceId =
      finalStatus !== ProductAvailabilityStatus.ON_REQUEST
        ? undefined
        : dto.productOrderSourceId === undefined
          ? existing.productOrderSourceId ?? undefined
          : dto.productOrderSourceId;

    this.precheck.validateOrderSourceRules(finalStatus, finalOrderSourceId);

    const finalStockQuantity = dto.stockQuantity ?? existing.stockQuantity;
    const finalReservedQuantity = dto.reservedQuantity ?? existing.reservedQuantity;
    this.precheck.validateQuantities(finalStockQuantity, finalReservedQuantity);

    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
          ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl.trim() } : {}),
          ...(dto.manufacturerId !== undefined ? { manufacturerId: dto.manufacturerId } : {}),
          ...(dto.activeSubstanceId !== undefined ? { activeSubstanceId: dto.activeSubstanceId } : {}),
          ...(dto.availabilityStatus !== undefined ? { availabilityStatus: finalStatus } : {}),
          ...(finalStatus !== ProductAvailabilityStatus.ON_REQUEST
            ? { productOrderSourceId: null }
            : dto.productOrderSourceId !== undefined
              ? { productOrderSourceId: dto.productOrderSourceId }
              : {}),
          ...(dto.stockQuantity !== undefined ? { stockQuantity: dto.stockQuantity } : {}),
          ...(dto.reservedQuantity !== undefined ? { reservedQuantity: dto.reservedQuantity } : {}),
          ...(dto.price !== undefined ? { price: dto.price } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
        include: {
          manufacturer: true,
          activeSubstance: true,
          orderSource: true,
        },
      });

      return this.mapProduct(product);
    } catch (error) {
      this.prismaErrorMapper.rethrow(error);
    }
  }

  private mapProduct<T extends { stockQuantity: number; reservedQuantity: number; availabilityStatus: ProductAvailabilityStatus }>(product: T) {
    return {
      ...product,
      availabilityStatusLabel: PRODUCT_AVAILABILITY_LABELS[product.availabilityStatus],
      availableQuantity: product.stockQuantity - product.reservedQuantity,
    };
  }

  async delete(id: number) {
    await this.findById(id);

    try {
      const deleted = await this.prisma.product.update({
        where: { id },
        data: { isActive: false },
        include: {
          manufacturer: true,
          activeSubstance: true,
          orderSource: true,
        },
      });

      return this.mapProduct(deleted);
    } catch (error) {
      this.prismaErrorMapper.rethrow(error);
    }
  }

}
