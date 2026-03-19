import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { OrderQueryDto } from '../dto/order-query.dto';
import { ORDER_EVENT_TYPES } from '../constants/order-event-types';
import { ORDER_HISTORY_FIELDS } from '../constants/order-history.config';
import { OrderHistoryService } from './order-history.service';
import { OrderInventoryService } from './order-inventory.service';
import { OrderPrecheckService } from './order-precheck.service';
import { PrismaErrorMapperService } from '../../common/prisma/prisma-error-mapper.service';
import { ORDER_STATUS_CODES } from '../constants/order-lifecycle.constants';
import { ORDER_FULL_INCLUDE } from '../order.constants';
import { OrdersSummaryQueryDto } from '../dto/orders-summary-query.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderHistoryService: OrderHistoryService,
    private readonly orderInventoryService: OrderInventoryService,
    private readonly precheck: OrderPrecheckService,
    private readonly prismaErrorMapper: PrismaErrorMapperService,
  ) {}

  async findAll(query: OrderQueryDto) {
    const where = {
      ...(query.clientId !== undefined ? { clientId: query.clientId } : {}),
      ...(query.countryId !== undefined ? { countryId: query.countryId } : {}),
      ...(query.cityId !== undefined ? { cityId: query.cityId } : {}),
      ...(query.responsibleUserId !== undefined ? { responsibleUserId: query.responsibleUserId } : {}),
      ...(query.paymentStatusId !== undefined ? { paymentStatusId: query.paymentStatusId } : {}),
      ...(query.orderStatusId !== undefined ? { orderStatusId: query.orderStatusId } : {}),
      ...(query.assemblyStatusId !== undefined ? { assemblyStatusId: query.assemblyStatusId } : {}),
      ...(query.storagePlaceId !== undefined ? { storagePlaceId: query.storagePlaceId } : {}),
      ...(query.deliveryCompanyId !== undefined ? { deliveryCompanyId: query.deliveryCompanyId } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              {
                clientNameSnapshot: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                clientPhoneSnapshot: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                address: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const orderBy = {
      [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc',
    } as Prisma.OrderOrderByWithRelationInput;
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    if (query.page !== undefined || query.pageSize !== undefined) {
      const [items, total] = await this.prisma.$transaction([
        this.prisma.order.findMany({
          where,
          include: {
            client: true,
            country: true,
            city: true,
            paymentStatus: true,
            orderStatus: true,
            assemblyStatus: true,
            storagePlace: true,
            responsibleUser: true,
            deliveryCompany: true,
            deliveryType: true,
            _count: {
              select: { items: true },
            },
          },
          orderBy,
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.order.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      };
    }

    return this.prisma.order.findMany({
      where,
      include: {
        client: true,
        country: true,
        city: true,
        paymentStatus: true,
        orderStatus: true,
        assemblyStatus: true,
        storagePlace: true,
        responsibleUser: true,
        deliveryCompany: true,
        deliveryType: true,
        _count: {
          select: { items: true },
        },
      },
      orderBy,
    });
  }

  async getSummary(query: OrdersSummaryQueryDto) {
    const createdAtFilter =
      query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {};

    const [newOrders, inProgress, unpaid, partiallyPaid, totalAmountResult] = await Promise.all([
      this.prisma.order.count({
        where: {
          ...createdAtFilter,
          orderStatus: { code: 'NEW' },
        },
      }),
      this.prisma.order.count({
        where: {
          ...createdAtFilter,
          orderStatus: { code: 'IN_PROGRESS' },
        },
      }),
      this.prisma.order.count({
        where: {
          ...createdAtFilter,
          paymentStatus: { code: 'UNPAID' },
        },
      }),
      this.prisma.order.count({
        where: {
          ...createdAtFilter,
          paymentStatus: { code: 'PARTIALLY_PAID' },
        },
      }),
      this.prisma.order.aggregate({
        _sum: { totalPrice: true },
        where: createdAtFilter,
      }),
    ]);

    return {
      newOrders,
      inProgress,
      unpaid,
      partiallyPaid,
      totalAmount: totalAmountResult._sum.totalPrice?.toString() ?? '0.00',
    };
  }

  async findById(id: number) {
    return this.loadOrderFullOrThrow(this.prisma, id);
  }

  async getHistory(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    return this.prisma.orderEvent.findMany({
      where: { orderId },
      include: {
        createdByUser: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async create(dto: CreateOrderDto, currentUserId: number) {
    if (!dto.items?.length) {
      throw new BadRequestException('Заказ должен содержать хотя бы одну позицию');
    }
    if (!dto.address.trim()) {
      throw new BadRequestException('Адрес обязателен');
    }

    const createdOrderId = await this.prisma.$transaction(async (tx) => {
      const context = await this.precheck.loadCreateContext(dto, tx);

      const productIds = [...new Set(dto.items.map((item) => item.productId))];
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        include: {
          manufacturer: true,
          activeSubstance: true,
          status: true,
          orderSource: true,
        },
      });

      if (products.length !== productIds.length) {
        throw new NotFoundException('Один или несколько товаров не найдены');
      }

      const productsById = new Map<number, (typeof products)[number]>(
        products.map((product) => [product.id, product]),
      );

      const preparedItems = dto.items.map((item) => {
        if (item.quantity <= 0) {
          throw new BadRequestException('Количество товара должно быть больше нуля');
        }

        const product = productsById.get(item.productId);
        if (!product) {
          throw new NotFoundException('Товар не найден');
        }

        const pricePerItem = this.toMoney(product.price);
        const lineTotal = this.toMoney(pricePerItem.mul(item.quantity));

        return {
          productId: item.productId,
          quantity: item.quantity,
          stockQuantity: product.stockQuantity,
          reservedQuantity: product.reservedQuantity,
          pricePerItem: pricePerItem.toFixed(2),
          lineTotal: lineTotal.toFixed(2),
          productNameSnapshot: product.name,
          productStatusNameSnapshot: product.status.name,
          orderSourceNameSnapshot: product.orderSource?.name ?? null,
          manufacturerNameSnapshot: product.manufacturer.name,
          activeSubstanceNameSnapshot: product.activeSubstance.name,
        };
      });

      const totals = this.calculateOrderTotals(
        preparedItems.map((item) => ({ lineTotal: item.lineTotal })),
        dto.deliveryPrice,
        dto.paidAmount,
      );

      const createdOrder = await tx.order.create({
        data: {
          clientId: dto.clientId,
          countryId: dto.countryId,
          cityId: dto.cityId,
          address: dto.address.trim(),
          ...(dto.deliveryCompanyId !== undefined ? { deliveryCompanyId: dto.deliveryCompanyId } : {}),
          ...(dto.deliveryTypeId !== undefined ? { deliveryTypeId: dto.deliveryTypeId } : {}),
          deliveryPrice: totals.deliveryPrice,
          itemsTotalPrice: totals.itemsTotalPrice,
          totalPrice: totals.totalPrice,
          paidAmount: totals.paidAmount,
          remainingAmount: totals.remainingAmount,
          paymentStatusId: dto.paymentStatusId,
          orderStatusId: dto.orderStatusId,
          ...(dto.assemblyStatusId !== undefined ? { assemblyStatusId: dto.assemblyStatusId } : {}),
          ...(dto.storagePlaceId !== undefined ? { storagePlaceId: dto.storagePlaceId } : {}),
          ...(dto.responsibleUserId !== undefined ? { responsibleUserId: dto.responsibleUserId } : {}),
          ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
          clientNameSnapshot: context.client.name,
          clientPhoneSnapshot: context.client.phone,
        },
      });

      for (const item of preparedItems) {
        await this.orderInventoryService.reserve(tx, {
          product: {
            id: item.productId,
            name: item.productNameSnapshot,
            stockQuantity: item.stockQuantity,
            reservedQuantity: item.reservedQuantity,
          },
          quantity: item.quantity,
          orderId: createdOrder.id,
          currentUserId,
        });
      }

      await tx.orderItem.createMany({
        data: preparedItems.map((item) => ({
          orderId: createdOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          pricePerItem: item.pricePerItem,
          lineTotal: item.lineTotal,
          productNameSnapshot: item.productNameSnapshot,
          productStatusNameSnapshot: item.productStatusNameSnapshot,
          orderSourceNameSnapshot: item.orderSourceNameSnapshot,
          manufacturerNameSnapshot: item.manufacturerNameSnapshot,
          activeSubstanceNameSnapshot: item.activeSubstanceNameSnapshot,
        })),
      });

      await this.orderHistoryService.logOrderCreated(tx, createdOrder.id, currentUserId, {
        clientId: createdOrder.clientId,
        totalPrice: totals.totalPrice,
        itemCount: preparedItems.length,
      });

      return createdOrder.id;
    }, { timeout: 15000 }).catch((error) => this.prismaErrorMapper.rethrow(error));

    return this.loadOrderFullOrThrow(this.prisma, createdOrderId);
  }

  async update(id: number, dto: UpdateOrderDto, currentUserId: number) {
    const existing = await this.prisma.order.findUnique({
      where: { id },
      include: {
        deliveryCompany: true,
        deliveryType: true,
        paymentStatus: true,
        orderStatus: true,
        assemblyStatus: true,
        storagePlace: true,
        responsibleUser: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Заказ не найден');
    }
    this.assertCanEditOrder(existing.orderStatus?.code ?? null, existing.orderStatus?.name ?? null);

    // Состав заказа (items) обновляется отдельным этапом и здесь не меняется.
    await this.precheck.loadUpdateContext(dto, existing, this.prisma);
    if (dto.address !== undefined && !dto.address.trim()) {
      throw new BadRequestException('Адрес обязателен');
    }

    const deliveryPrice = dto.deliveryPrice ?? existing.deliveryPrice;
    const paidAmount = dto.paidAmount ?? existing.paidAmount;

    const totals = this.recalculateFromExistingItemsTotal(
      existing.itemsTotalPrice.toString(),
      deliveryPrice,
      paidAmount,
    );

    return this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: {
          ...(dto.address !== undefined ? { address: dto.address.trim() } : {}),
          ...(dto.deliveryCompanyId !== undefined ? { deliveryCompanyId: dto.deliveryCompanyId } : {}),
          ...(dto.deliveryTypeId !== undefined ? { deliveryTypeId: dto.deliveryTypeId } : {}),
          ...(dto.deliveryPrice !== undefined ? { deliveryPrice: totals.deliveryPrice } : {}),
          ...(dto.paymentStatusId !== undefined ? { paymentStatusId: dto.paymentStatusId } : {}),
          ...(dto.orderStatusId !== undefined ? { orderStatusId: dto.orderStatusId } : {}),
          ...(dto.assemblyStatusId !== undefined ? { assemblyStatusId: dto.assemblyStatusId } : {}),
          ...(dto.storagePlaceId !== undefined ? { storagePlaceId: dto.storagePlaceId } : {}),
          ...(dto.responsibleUserId !== undefined ? { responsibleUserId: dto.responsibleUserId } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description === null ? null : dto.description.trim() }
            : {}),
          ...(dto.paidAmount !== undefined ? { paidAmount: totals.paidAmount } : {}),
          totalPrice: totals.totalPrice,
          remainingAmount: totals.remainingAmount,
        },
      });

      const updated = await this.loadOrderFullOrThrow(tx, id);
      const changeEvents = this.buildOrderChangeEvents(existing, updated, currentUserId);
      await this.orderHistoryService.logOrderFieldChanges(tx, changeEvents);

      return updated;
    }).catch((error) => this.prismaErrorMapper.rethrow(error));
  }

  private buildOrderChangeEvents(
    existing: Prisma.OrderGetPayload<{
      include: {
        deliveryCompany: true;
        deliveryType: true;
        paymentStatus: true;
        orderStatus: true;
        assemblyStatus: true;
        storagePlace: true;
        responsibleUser: true;
      };
    }>,
    updated: Prisma.OrderGetPayload<{ include: typeof ORDER_FULL_INCLUDE }>,
    currentUserId: number,
  ) {
    const events: Prisma.OrderEventCreateManyInput[] = [];

    for (const field of ORDER_HISTORY_FIELDS) {
      const oldValue = field.getValue(existing);
      const newValue = field.getValue(updated);

      if (JSON.stringify(oldValue ?? null) === JSON.stringify(newValue ?? null)) {
        continue;
      }

      events.push({
        orderId: existing.id,
        createdByUserId: currentUserId,
        eventType: ORDER_EVENT_TYPES.ORDER_FIELD_CHANGED,
        fieldName: field.fieldName,
        oldValueJson: oldValue ?? Prisma.JsonNull,
        newValueJson: newValue ?? Prisma.JsonNull,
        message: field.message,
      });
    }

    return events;
  }

  private calculateOrderTotals(
    items: Array<{ lineTotal: string }>,
    deliveryPriceInput?: Decimal.Value,
    paidAmountInput?: Decimal.Value,
  ) {
    const deliveryPrice = this.toMoney(deliveryPriceInput ?? 0);
    const paidAmount = this.toMoney(paidAmountInput ?? 0);

    if (deliveryPrice.isNegative()) {
      throw new BadRequestException('Цена доставки не может быть отрицательной');
    }

    if (paidAmount.isNegative()) {
      throw new BadRequestException('Сумма оплаты не может быть отрицательной');
    }

    const itemsTotalPrice = items.reduce((sum, item) => sum.plus(this.toMoney(item.lineTotal)), new Decimal(0));
    const totalPrice = itemsTotalPrice.plus(deliveryPrice);

    if (paidAmount.greaterThan(totalPrice)) {
      throw new BadRequestException('Сумма оплаты не может быть больше суммы заказа');
    }

    const remainingAmount = totalPrice.minus(paidAmount);

    return {
      deliveryPrice: deliveryPrice.toFixed(2),
      itemsTotalPrice: itemsTotalPrice.toFixed(2),
      totalPrice: totalPrice.toFixed(2),
      paidAmount: paidAmount.toFixed(2),
      remainingAmount: remainingAmount.toFixed(2),
    };
  }

  private recalculateFromExistingItemsTotal(
    itemsTotalPrice: string,
    deliveryPriceInput?: Decimal.Value,
    paidAmountInput?: Decimal.Value,
  ) {
    return this.calculateOrderTotals(
      [{ lineTotal: itemsTotalPrice }],
      deliveryPriceInput,
      paidAmountInput,
    );
  }

  private toMoney(value: Prisma.Decimal | Decimal | number | string) {
    return new Decimal(value as Decimal.Value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  private async loadOrderFullOrThrow(db: PrismaService | Prisma.TransactionClient, orderId: number) {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: ORDER_FULL_INCLUDE,
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    return order;
  }

  private assertCanEditOrder(statusCode: string | null, statusName: string | null) {
    const normalizedCode = (statusCode ?? '').toUpperCase();
    const normalizedName = (statusName ?? '').toLowerCase();
    if (
      normalizedCode === ORDER_STATUS_CODES.CANCELLED ||
      normalizedCode === ORDER_STATUS_CODES.CLOSED ||
      normalizedName.includes('отмен') ||
      normalizedName.includes('закры')
    ) {
      throw new BadRequestException('Заказ в финальном статусе и недоступен для редактирования');
    }
  }
}
