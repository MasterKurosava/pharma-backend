import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaErrorMapperService } from '../common/prisma/prisma-error-mapper.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { ProductPrecheckService } from './product-precheck.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly precheck: ProductPrecheckService,
    private readonly prismaErrorMapper: PrismaErrorMapperService,
  ) {}

  async findAll(query: ProductQueryDto) {
    const where = {
      ...(typeof query.isActive === 'boolean' ? { isActive: query.isActive } : {}),
      ...(query.manufacturerId !== undefined ? { manufacturerId: query.manufacturerId } : {}),
      ...(query.activeSubstanceId !== undefined ? { activeSubstanceId: query.activeSubstanceId } : {}),
      ...(query.productStatusId !== undefined ? { productStatusId: query.productStatusId } : {}),
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
        status: true,
        orderSource: true,
      },
      orderBy: [{ name: 'asc' }],
    });

    return products.map((product) => this.mapProduct(product));
  }

  async findById(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        manufacturer: true,
        activeSubstance: true,
        status: true,
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
    this.precheck.validateQuantities(dto.stockQuantity, dto.reservedQuantity);

    try {
      const product = await this.prisma.product.create({
        data: {
          name: dto.name.trim(),
          ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
          ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl.trim() } : {}),
          manufacturerId: dto.manufacturerId,
          activeSubstanceId: dto.activeSubstanceId,
          productStatusId: dto.productStatusId,
          ...(dto.productOrderSourceId !== undefined
            ? { productOrderSourceId: dto.productOrderSourceId }
            : {}),
          stockQuantity: dto.stockQuantity,
          reservedQuantity: dto.reservedQuantity,
          price: dto.price,
          isActive: dto.isActive ?? true,
        },
        include: {
          manufacturer: true,
          activeSubstance: true,
          status: true,
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
        status: true,
        orderSource: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Товар не найден');
    }

    await this.precheck.loadUpdateContext(dto, this.prisma);

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
          ...(dto.productStatusId !== undefined ? { productStatusId: dto.productStatusId } : {}),
          ...(dto.productOrderSourceId !== undefined
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
          status: true,
          orderSource: true,
        },
      });

      return this.mapProduct(product);
    } catch (error) {
      this.prismaErrorMapper.rethrow(error);
    }
  }

  private mapProduct<T extends { stockQuantity: number; reservedQuantity: number }>(product: T) {
    return {
      ...product,
      availableQuantity: product.stockQuantity - product.reservedQuantity,
    };
  }

}
