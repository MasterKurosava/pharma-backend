import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatusCode, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderFullDto } from '../dto/update-order-full.dto';
import { OrderQueryDto } from '../dto/order-query.dto';
import { OrderInventoryService } from './order-inventory.service';
import { OrderPrecheckService } from './order-precheck.service';
import { PrismaErrorMapperService } from '../../common/prisma/prisma-error-mapper.service';
import { ORDER_FULL_INCLUDE } from '../order.constants';
import { ORDER_FILTER_QUERY_MAP } from '../constants/order-access.constants';
import { OrdersSummaryQueryDto } from '../dto/orders-summary-query.dto';
import { SaveOrderItemDto } from '../dto/items/save-order-item.dto';
import { AccessPolicyService } from '../../common/access/access-policy.service';
import { OrderFilterKey, OrderUpdateFieldKey } from '../../common/access/access-policy.types';
import { PRODUCT_AVAILABILITY_LABELS } from '../../products/constants/product-status.constants';

const ORDER_LIST_INCLUDE = {
  country: true,
  storagePlace: true,
  items: {
    select: {
      productId: true,
      productNameSnapshot: true,
      quantity: true,
    },
    orderBy: { id: 'asc' as const },
    take: 2,
  },
  _count: {
    select: { items: true },
  },
} as const;

type FixedOrderFilters = { countryId?: number; city?: string; orderStatus?: string; deliveryStatuses?: string[] };

@Injectable()
export class OrdersService {
  private static readonly MAX_MONEY = new Decimal('99999999.99');

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderInventoryService: OrderInventoryService,
    private readonly precheck: OrderPrecheckService,
    private readonly prismaErrorMapper: PrismaErrorMapperService,
    private readonly accessPolicy: AccessPolicyService,
  ) {}

  async findAll(query: OrderQueryDto, roleCode: string) {
    const policy = await this.accessPolicy.getAccessPolicy(roleCode);
    const effectiveQuery = this.applyOrderFilterPolicy(query, policy.orders.visibleFilters, policy.orders.fixedFilters);
    const where = this.buildOrderWhere(effectiveQuery);
    const orderBy = this.buildOrderBy(effectiveQuery);
    const page = effectiveQuery.page ?? 1;
    const pageSize = effectiveQuery.pageSize ?? 20;

    if (effectiveQuery.page !== undefined || effectiveQuery.pageSize !== undefined) {
      const [items, total] = await this.prisma.$transaction([
        this.prisma.order.findMany({
          where,
          include: ORDER_LIST_INCLUDE,
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
      include: ORDER_LIST_INCLUDE,
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
          orderStatus: 'ORDER',
        },
      }),
      this.prisma.order.count({
        where: {
          ...createdAtFilter,
          orderStatus: 'DELIVERY_REGISTRATION',
        },
      }),
      this.prisma.order.count({
        where: {
          ...createdAtFilter,
          paymentStatus: 'UNPAID',
        },
      }),
      this.prisma.order.count({
        where: {
          ...createdAtFilter,
          paymentStatus: 'PREPAID_50',
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

  async create(dto: CreateOrderDto, currentUserId: number) {
    this.assertOrderHasItems(dto.items?.length ?? 0);
    if (!dto.address.trim()) {
      throw new BadRequestException('Адрес обязателен');
    }

    return this.prisma
      .$transaction(async (tx) => {
      await this.precheck.loadCreateContext(dto, tx);

      const productIds = [...new Set(dto.items.map((item) => item.productId))];
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        include: {
          manufacturer: true,
          activeSubstance: true,
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
          productStatusNameSnapshot: PRODUCT_AVAILABILITY_LABELS[product.availabilityStatus],
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
        data: this.buildCreateOrderData(dto, totals),
      });

      // Reserve inventory once per product to reduce round-trips for duplicate product rows.
      const reserveByProduct = new Map<
        number,
        { quantity: number; stockQuantity: number; reservedQuantity: number; productName: string }
      >();
      for (const item of preparedItems) {
        const existing = reserveByProduct.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
          continue;
        }
        reserveByProduct.set(item.productId, {
          quantity: item.quantity,
          stockQuantity: item.stockQuantity,
          reservedQuantity: item.reservedQuantity,
          productName: item.productNameSnapshot,
        });
      }

      for (const [productId, reserve] of reserveByProduct) {
        await this.orderInventoryService.reserve(tx, {
          product: {
            id: productId,
            name: reserve.productName,
            stockQuantity: reserve.stockQuantity,
            reservedQuantity: reserve.reservedQuantity,
          },
          quantity: reserve.quantity,
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

      return this.loadOrderFullOrThrow(tx, createdOrder.id);
      }, { timeout: 15000 })
      .catch((error) => this.prismaErrorMapper.rethrow(error));
  }

  async update(id: number, dto: UpdateOrderFullDto, currentUserId: number, roleCode: string) {
    const policy = await this.accessPolicy.getAccessPolicy(roleCode);
    const sanitizedDto = this.sanitizeUpdateDtoByPolicy(dto, policy.orders.editableFields);

    if (sanitizedDto.address !== undefined && !sanitizedDto.address.trim()) {
      throw new BadRequestException('Адрес обязателен');
    }

    return this.prisma.$transaction(async (tx) => {
      const currentOrder = await this.loadOrderFullOrThrow(tx, id);
      this.assertCanEditOrder(currentOrder.orderStatus);
      await this.precheck.loadUpdateContext(sanitizedDto, currentOrder, tx);
      let itemsForTotals = currentOrder.items.map((item) => ({ lineTotal: item.lineTotal.toString() }));

      if (sanitizedDto.items !== undefined) {
        itemsForTotals = await this.replaceOrderItems(tx, currentOrder, sanitizedDto.items, currentUserId);
      }

      const deliveryPrice = sanitizedDto.deliveryPrice ?? currentOrder.deliveryPrice;
      const paidAmount = sanitizedDto.paidAmount ?? currentOrder.paidAmount;
      const totals = this.calculateOrderTotals(itemsForTotals, deliveryPrice, paidAmount);

      const updated = await tx.order.update({
        where: { id },
        data: this.buildUpdateOrderData(sanitizedDto, totals),
        include: ORDER_FULL_INCLUDE,
      });
      return updated;
    }, { timeout: 15000 }).catch((error) => this.prismaErrorMapper.rethrow(error));
  }

  async delete(id: number, currentUserId: number) {
    return this.prisma
      .$transaction(async (tx) => {
        const order = await this.loadOrderFullOrThrow(tx, id);

        // Undo reserved quantities for current order items.
        for (const item of order.items) {
          await this.orderInventoryService.release(tx, {
            productId: item.productId,
            quantity: item.quantity,
            orderId: id,
            currentUserId,
          });
        }

        // Clean up relations explicitly (no cascade in Prisma schema).
        await tx.orderItem.deleteMany({ where: { orderId: id } });
        await tx.productStockMovement.deleteMany({ where: { orderId: id } });

        await tx.order.delete({ where: { id } });

        return id;
      }, { timeout: 15000 })
      .catch((error) => this.prismaErrorMapper.rethrow(error));
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

    if (
      deliveryPrice.greaterThan(OrdersService.MAX_MONEY) ||
      itemsTotalPrice.greaterThan(OrdersService.MAX_MONEY) ||
      totalPrice.greaterThan(OrdersService.MAX_MONEY) ||
      paidAmount.greaterThan(OrdersService.MAX_MONEY)
    ) {
      throw new BadRequestException('Сумма заказа превышает допустимый лимит 99 999 999.99');
    }

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

  private async replaceOrderItems(
    tx: Prisma.TransactionClient,
    order: Prisma.OrderGetPayload<{ include: typeof ORDER_FULL_INCLUDE }>,
    items: SaveOrderItemDto[],
    currentUserId: number,
  ) {
    this.assertOrderHasItems(items.length);

    const existingById = new Map(order.items.map((item) => [item.id, item]));
    const usedIds = new Set<number>();

    for (const item of items) {
      if (item.id !== undefined) {
        if (usedIds.has(item.id)) {
          throw new BadRequestException('Дубликат id позиции в payload');
        }
        usedIds.add(item.id);
        if (!existingById.has(item.id)) {
          throw new NotFoundException(`Позиция заказа с id=${item.id} не найдена`);
        }
      }
    }

    const productIds = [...new Set(items.map((item) => item.productId))];
    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
      include: {
        manufacturer: true,
        activeSubstance: true,
        orderSource: true,
      },
    });
    if (products.length !== productIds.length) {
      throw new NotFoundException('Один или несколько товаров не найдены');
    }
    const productById = new Map(products.map((p) => [p.id, p]));

    const currentPerProduct = new Map<number, number>();
    for (const item of order.items) {
      currentPerProduct.set(item.productId, (currentPerProduct.get(item.productId) ?? 0) + item.quantity);
    }

    const desiredPerProduct = new Map<number, number>();
    for (const item of items) {
      desiredPerProduct.set(item.productId, (desiredPerProduct.get(item.productId) ?? 0) + item.quantity);
    }

    const allProductIds = new Set<number>([...currentPerProduct.keys(), ...desiredPerProduct.keys()]);
    for (const productId of allProductIds) {
      const currentQty = currentPerProduct.get(productId) ?? 0;
      const desiredQty = desiredPerProduct.get(productId) ?? 0;
      const delta = desiredQty - currentQty;

      if (delta > 0) {
        const product = productById.get(productId);
        if (!product) {
          throw new NotFoundException('Товар не найден');
        }
        await this.orderInventoryService.reserve(tx, {
          product,
          quantity: delta,
          orderId: order.id,
          currentUserId,
        });
      } else if (delta < 0) {
        await this.orderInventoryService.release(tx, {
          productId,
          quantity: Math.abs(delta),
          orderId: order.id,
          currentUserId,
        });
      }
    }

    const desiredRows = items.map((item) => {
      const product = productById.get(item.productId);
      if (!product) {
        throw new NotFoundException('Товар не найден');
      }
      const pricePerItem = this.toMoney(product.price);
      const lineTotal = this.toMoney(pricePerItem.mul(item.quantity));
      return {
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        pricePerItem: pricePerItem.toFixed(2),
        lineTotal: lineTotal.toFixed(2),
        productNameSnapshot: product.name,
        productStatusNameSnapshot: PRODUCT_AVAILABILITY_LABELS[product.availabilityStatus],
        orderSourceNameSnapshot: product.orderSource?.name ?? null,
        manufacturerNameSnapshot: product.manufacturer.name,
        activeSubstanceNameSnapshot: product.activeSubstance.name,
      };
    });

    const incomingIds = new Set(items.filter((item) => item.id !== undefined).map((item) => item.id as number));
    const idsToDelete = order.items
      .filter((existingItem) => !incomingIds.has(existingItem.id))
      .map((existingItem) => existingItem.id);

    if (idsToDelete.length) {
      await tx.orderItem.deleteMany({
        where: {
          orderId: order.id,
          id: { in: idsToDelete },
        },
      });
    }

    const rowsToCreate = desiredRows.filter((row, index) => items[index]?.id === undefined);
    if (rowsToCreate.length) {
      await tx.orderItem.createMany({ data: rowsToCreate });
    }

    const rowsToUpdate = desiredRows
      .map((row, index) => ({ row, source: items[index] }))
      .filter(
        (entry): entry is { row: (typeof desiredRows)[number]; source: SaveOrderItemDto & { id: number } } =>
          entry.source.id !== undefined,
      );

    if (rowsToUpdate.length) {
      await Promise.all(
        rowsToUpdate.map(async ({ row, source }) => {
          const existingItem = existingById.get(source.id);
          if (!existingItem) {
            throw new NotFoundException(`Позиция заказа с id=${source.id} не найдена`);
          }

          const shouldUpdate =
            existingItem.productId !== row.productId ||
            existingItem.quantity !== row.quantity ||
            existingItem.pricePerItem.toString() !== row.pricePerItem ||
            existingItem.lineTotal.toString() !== row.lineTotal ||
            existingItem.productNameSnapshot !== row.productNameSnapshot ||
            existingItem.productStatusNameSnapshot !== row.productStatusNameSnapshot ||
            (existingItem.orderSourceNameSnapshot ?? null) !== (row.orderSourceNameSnapshot ?? null) ||
            existingItem.manufacturerNameSnapshot !== row.manufacturerNameSnapshot ||
            existingItem.activeSubstanceNameSnapshot !== row.activeSubstanceNameSnapshot;

          if (!shouldUpdate) {
            return;
          }

          await tx.orderItem.update({
            where: { id: source.id },
            data: {
              productId: row.productId,
              quantity: row.quantity,
              pricePerItem: row.pricePerItem,
              lineTotal: row.lineTotal,
              productNameSnapshot: row.productNameSnapshot,
              productStatusNameSnapshot: row.productStatusNameSnapshot,
              orderSourceNameSnapshot: row.orderSourceNameSnapshot,
              manufacturerNameSnapshot: row.manufacturerNameSnapshot,
              activeSubstanceNameSnapshot: row.activeSubstanceNameSnapshot,
            },
          });
        }),
      );
    }

    return desiredRows.map((row) => ({ lineTotal: row.lineTotal }));
  }

  private toMoney(value: Prisma.Decimal | Decimal | number | string) {
    return new Decimal(value as Decimal.Value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  private assertOrderHasItems(itemsCount: number) {
    if (itemsCount <= 0) {
      throw new BadRequestException('Заказ должен содержать хотя бы одну позицию');
    }
  }

  private buildOrderBy(query: OrderQueryDto): Prisma.OrderOrderByWithRelationInput {
    return {
      [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc',
    } as Prisma.OrderOrderByWithRelationInput;
  }

  private buildOrderWhere(query: OrderQueryDto): Prisma.OrderWhereInput {
    const where: Record<string, unknown> = {};

    if (query.clientPhone !== undefined) {
      where.clientPhone = { contains: query.clientPhone, mode: 'insensitive' };
    }
    if (query.countryId !== undefined) {
      where.countryId = query.countryId;
    }
    if (query.city !== undefined) {
      where.city = { contains: query.city, mode: 'insensitive' };
    }
    if (query.paymentStatus !== undefined) {
      where.paymentStatus = query.paymentStatus;
    }
    if (query.storagePlaceId !== undefined) {
      where.storagePlaceId = query.storagePlaceId;
    }
    if (query.deliveryStatus !== undefined) {
      where.deliveryStatus = query.deliveryStatus;
    }

    const orderStatusesFilter = this.resolveOrderStatusesFilter(query);
    if (orderStatusesFilter) {
      where.orderStatus = { in: orderStatusesFilter };
    }

    const createdAtFilter = this.buildCreatedAtFilter(query.dateFrom, query.dateTo);
    if (createdAtFilter) {
      where.createdAt = createdAtFilter;
    }

    if (query.search) {
      where.OR = [
        { clientPhone: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
        { address: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return where as Prisma.OrderWhereInput;
  }

  private resolveOrderStatusesFilter(query: OrderQueryDto): OrderStatusCode[] | undefined {
    if (query.orderStatuses?.length) {
      return query.orderStatuses;
    }
    return query.orderStatus ? [query.orderStatus] : undefined;
  }

  private buildCreatedAtFilter(dateFrom?: string, dateTo?: string): Prisma.DateTimeFilter | undefined {
    if (!dateFrom && !dateTo) return undefined;
    return {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  }

  private buildCreateOrderData(
    dto: CreateOrderDto,
    totals: {
      deliveryPrice: string;
      itemsTotalPrice: string;
      totalPrice: string;
      paidAmount: string;
      remainingAmount: string;
    },
  ): Prisma.OrderUncheckedCreateInput {
    return {
      clientPhone: dto.clientPhone.trim(),
      countryId: dto.countryId,
      city: dto.city.trim(),
      address: dto.address.trim(),
      deliveryStatus: dto.deliveryStatus,
      deliveryPrice: totals.deliveryPrice,
      itemsTotalPrice: totals.itemsTotalPrice,
      totalPrice: totals.totalPrice,
      paidAmount: totals.paidAmount,
      remainingAmount: totals.remainingAmount,
      paymentStatus: dto.paymentStatus,
      orderStatus: dto.orderStatus,
      ...(dto.storagePlaceId !== undefined ? { storagePlaceId: dto.storagePlaceId } : {}),
      ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
    } as unknown as Prisma.OrderUncheckedCreateInput;
  }

  private buildUpdateOrderData(
    dto: UpdateOrderFullDto,
    totals: {
      itemsTotalPrice: string;
      totalPrice: string;
      remainingAmount: string;
      paidAmount: string;
      deliveryPrice: string;
    },
  ): Prisma.OrderUncheckedUpdateInput {
    return {
      ...(dto.clientPhone !== undefined ? { clientPhone: dto.clientPhone.trim() } : {}),
      ...(dto.countryId !== undefined ? { countryId: dto.countryId } : {}),
      ...(dto.city !== undefined ? { city: dto.city.trim() } : {}),
      ...(dto.address !== undefined ? { address: dto.address.trim() } : {}),
      ...(dto.deliveryStatus !== undefined ? { deliveryStatus: dto.deliveryStatus } : {}),
      ...(dto.deliveryPrice !== undefined ? { deliveryPrice: totals.deliveryPrice } : {}),
      ...(dto.paymentStatus !== undefined ? { paymentStatus: dto.paymentStatus } : {}),
      ...(dto.orderStatus !== undefined ? { orderStatus: dto.orderStatus } : {}),
      ...(dto.storagePlaceId !== undefined ? { storagePlaceId: dto.storagePlaceId } : {}),
      ...(dto.description !== undefined ? { description: dto.description === null ? null : dto.description.trim() } : {}),
      ...(dto.paidAmount !== undefined ? { paidAmount: totals.paidAmount } : {}),
      itemsTotalPrice: totals.itemsTotalPrice,
      totalPrice: totals.totalPrice,
      remainingAmount: totals.remainingAmount,
    } as unknown as Prisma.OrderUncheckedUpdateInput;
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

  private assertCanEditOrder(status: OrderStatusCode) {
    if (status === OrderStatusCode.CLOSED) {
      throw new BadRequestException('Заказ в финальном статусе и недоступен для редактирования');
    }
  }

  private applyOrderFilterPolicy(
    query: OrderQueryDto,
    visibleFilters: OrderFilterKey[],
    fixedFilters: FixedOrderFilters,
  ): OrderQueryDto {
    const allowed = new Set<OrderFilterKey>(visibleFilters);
    const filtered: Partial<OrderQueryDto> = {};

    const copyFilter = <K extends keyof OrderQueryDto>(key: K, filterKey: OrderFilterKey) => {
      if (!allowed.has(filterKey)) return;
      if (query[key] !== undefined) filtered[key] = query[key] as never;
    };

    for (const entry of ORDER_FILTER_QUERY_MAP) {
      copyFilter(entry.queryKey, entry.filterKey);
    }

    filtered.page = query.page;
    filtered.pageSize = query.pageSize;
    filtered.sortBy = query.sortBy;
    filtered.sortOrder = query.sortOrder;

    if (fixedFilters.countryId !== undefined) {
      filtered.countryId = fixedFilters.countryId;
    }
    if (fixedFilters.city !== undefined) {
      filtered.city = fixedFilters.city;
    }
    if (fixedFilters.orderStatus !== undefined) {
      filtered.orderStatus = fixedFilters.orderStatus as OrderQueryDto['orderStatus'];
    }
    if (fixedFilters.deliveryStatuses && fixedFilters.deliveryStatuses.length > 0) {
      const requested = filtered.deliveryStatus;
      if (!requested || !fixedFilters.deliveryStatuses.includes(requested)) {
        filtered.deliveryStatus = fixedFilters.deliveryStatuses[0] as OrderQueryDto['deliveryStatus'];
      }
    }

    return filtered as OrderQueryDto;
  }

  private sanitizeUpdateDtoByPolicy(dto: UpdateOrderFullDto, editableFields: OrderUpdateFieldKey[]): UpdateOrderFullDto {
    const allowed = new Set<OrderUpdateFieldKey>(editableFields);
    const source = dto as Record<string, unknown>;
    const blocked = Object.keys(source).filter((key) => source[key] !== undefined && !allowed.has(key as OrderUpdateFieldKey));

    if (blocked.length > 0) {
      throw new ForbiddenException(`Недостаточно прав для изменения полей: ${blocked.join(', ')}`);
    }

    return dto;
  }
}
