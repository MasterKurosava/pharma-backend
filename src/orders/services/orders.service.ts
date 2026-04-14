import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatusConfig, PaymentStatusCode, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderFullDto } from '../dto/update-order-full.dto';
import { OrderQueryDto } from '../dto/order-query.dto';
import { OrderInventoryService } from './order-inventory.service';
import { OrderPrecheckService } from './order-precheck.service';
import { PrismaErrorMapperService } from '../../common/prisma/prisma-error-mapper.service';
import { FullOrder, ORDER_FULL_INCLUDE } from '../order.constants';
import { ORDER_FILTER_QUERY_MAP } from '../constants/order-access.constants';
import { OrdersSummaryQueryDto } from '../dto/orders-summary-query.dto';
import { UpdateOrdersBatchStatusDto } from '../dto/update-orders-batch-status.dto';
import { AccessPolicyService } from '../../common/access/access-policy.service';
import {
  OrderFilterKey,
  OrderTableGroupKey,
  OrderUpdateFieldKey,
} from '../../common/access/access-policy.types';
import { PRODUCT_AVAILABILITY_LABELS } from '../../products/constants/product-status.constants';

const ORDER_LIST_INCLUDE = {
  storagePlace: true,
  actionStatus: true,
  stateStatus: true,
  assemblyStatus: true,
} as const;

type FixedOrderFilters = {
  city?: string;
  orderStatus?: string;
  tableGroup?: OrderTableGroupKey;
};

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
    const effectiveQuery = this.applyOrderFilterPolicy(
      query,
      policy.orders.visibleFilters,
      policy.orders.fixedFilters,
      policy.orders.allowedTableGroups,
    );
    const where = this.buildOrderWhere(
      effectiveQuery,
      policy.orders.allowedTableGroups,
    );
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
          actionStatusCode: 'ACTION_IN_STOCK',
        },
      }),
      this.prisma.order.count({
        where: {
          ...createdAtFilter,
          actionStatusCode: 'ACTION_COLLECT_DELIVERY_ALMATY',
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
    return this.withOrderTransaction(async (tx) => {
      await this.precheck.loadCreateContext(dto, tx);
      const product = await tx.product.findUnique({
        where: { id: dto.productId },
        include: {
          manufacturer: true,
          activeSubstance: true,
          orderSource: true,
        },
      });
      if (!product) {
        throw new NotFoundException('Товар не найден');
      }
      const pricePerItem = this.toMoney(dto.productPrice ?? product.price);
      const quantity = dto.quantity;
      if (quantity <= 0) {
        throw new BadRequestException('Количество товара должно быть больше нуля');
      }
      const totals = this.calculateOrderTotals(
        pricePerItem.toFixed(2),
        quantity,
        dto.deliveryPrice,
        dto.paymentStatus ?? PaymentStatusCode.UNPAID,
      );
      const actionStatus = await this.getStatusConfig(tx, dto.actionStatusCode, 'ACTION');
      const stateStatus = await this.getStatusConfig(tx, dto.stateStatusCode, 'STATE');
      const now = new Date();
      const paymentDates = this.resolvePaymentDates(undefined, dto.paymentStatus ?? PaymentStatusCode.UNPAID, now);

      const createdOrder = await tx.order.create({
        data: {
          clientPhone: dto.clientPhone.trim(),
          clientFullName: dto.clientFullName?.trim() || undefined,
          city: dto.city?.trim() || undefined,
          address: dto.address?.trim() || undefined,
          deliveryPrice: totals.deliveryPrice,
          itemsTotalPrice: totals.itemsTotalPrice,
          totalPrice: totals.totalPrice,
          remainingAmount: totals.remainingAmount,
          paymentStatus: dto.paymentStatus ?? PaymentStatusCode.UNPAID,
          prepaymentDate: paymentDates.prepaymentDate,
          paymentDate: paymentDates.paymentDate,
          actionStatusCode: dto.actionStatusCode,
          stateStatusCode: dto.stateStatusCode,
          assemblyStatusCode: dto.assemblyStatusCode?.trim() || null,
          storagePlaceId: dto.storagePlaceId,
          orderStorage: dto.orderStorage?.trim() || null,
          description: dto.description?.trim() || null,
          productId: product.id,
          productNameSnapshot: product.name,
          productStatusNameSnapshot: PRODUCT_AVAILABILITY_LABELS[product.availabilityStatus],
          orderSourceNameSnapshot: product.orderSource?.name ?? null,
          manufacturerNameSnapshot: product.manufacturer.name,
          activeSubstanceNameSnapshot: product.activeSubstance.name,
          productPrice: pricePerItem.toFixed(2),
          quantity,
          ...(actionStatus.setAssemblyDateOnSet ? { assemblyDate: now } : {}),
        },
      });
      await this.applyStatusInventoryAutomation(tx, {
        orderId: createdOrder.id,
        currentUserId,
        quantity,
        productId: product.id,
        previousActionStatus: null,
        nextActionStatus: actionStatus,
      });

      return this.loadOrderFullOrThrow(tx, createdOrder.id);
    });
  }

  async update(id: number, dto: UpdateOrderFullDto, currentUserId: number, roleCode: string) {
    const policy = await this.accessPolicy.getAccessPolicy(roleCode);
    const sanitizedDto = this.sanitizeUpdateDtoByPolicy(dto, policy.orders.editableFields);

    if (typeof sanitizedDto.address === 'string' && !sanitizedDto.address.trim()) {
      throw new BadRequestException('Адрес обязателен');
    }

    return this.withOrderTransaction(async (tx) => {
      const currentOrder: FullOrder = await this.loadOrderFullOrThrow(tx, id);
      const currentOrderStatusCodes = currentOrder as FullOrder & {
        actionStatusCode: string;
        stateStatusCode: string;
      };
      await this.precheck.loadUpdateContext(sanitizedDto, currentOrder, tx);
      const nextProductId = sanitizedDto.productId ?? currentOrder.productId;
      const nextQuantity = sanitizedDto.quantity ?? currentOrder.quantity;
      if (nextQuantity <= 0) {
        throw new BadRequestException('Количество товара должно быть больше нуля');
      }
      const nextProduct = await tx.product.findUnique({
        where: { id: nextProductId },
        include: {
          manufacturer: true,
          activeSubstance: true,
          orderSource: true,
        },
      });
      if (!nextProduct) {
        throw new NotFoundException('Товар не найден');
      }
      const nextProductPrice = this.toMoney(sanitizedDto.productPrice ?? currentOrder.productPrice);
      const nextPaymentStatus = sanitizedDto.paymentStatus ?? currentOrder.paymentStatus;
      const totals = this.calculateOrderTotals(
        nextProductPrice.toFixed(2),
        nextQuantity,
        sanitizedDto.deliveryPrice ?? currentOrder.deliveryPrice,
        nextPaymentStatus,
      );
      const nextActionStatusCode =
        sanitizedDto.actionStatusCode ?? currentOrderStatusCodes.actionStatusCode;
      const nextStateStatusCode =
        sanitizedDto.stateStatusCode ?? currentOrderStatusCodes.stateStatusCode;
      const [nextActionStatus, nextStateStatus] = await Promise.all([
        this.getStatusConfig(tx, nextActionStatusCode, 'ACTION'),
        this.getStatusConfig(tx, nextStateStatusCode, 'STATE'),
      ]);
      const now = new Date();
      const paymentDates = this.resolvePaymentDates(
        {
          paymentDate: currentOrder.paymentDate,
          prepaymentDate: currentOrder.prepaymentDate,
          paymentStatus: currentOrder.paymentStatus,
        },
        nextPaymentStatus,
        now,
      );

      const updated = await tx.order.update({
        where: { id },
        data: {
          ...(sanitizedDto.clientPhone !== undefined ? { clientPhone: sanitizedDto.clientPhone.trim() } : {}),
          ...(sanitizedDto.clientFullName !== undefined
            ? { clientFullName: sanitizedDto.clientFullName === null ? null : sanitizedDto.clientFullName.trim() }
            : {}),
          ...(sanitizedDto.city !== undefined ? { city: sanitizedDto.city === null ? null : sanitizedDto.city.trim() } : {}),
          ...(sanitizedDto.address !== undefined
            ? { address: sanitizedDto.address === null ? null : sanitizedDto.address.trim() }
            : {}),
          ...(sanitizedDto.deliveryPrice !== undefined ? { deliveryPrice: totals.deliveryPrice } : {}),
          ...(sanitizedDto.paymentStatus !== undefined ? { paymentStatus: nextPaymentStatus } : {}),
          ...(sanitizedDto.actionStatusCode !== undefined ? { actionStatusCode: nextActionStatusCode } : {}),
          ...(sanitizedDto.stateStatusCode !== undefined ? { stateStatusCode: nextStateStatusCode } : {}),
          ...(sanitizedDto.assemblyStatusCode !== undefined
            ? {
                assemblyStatusCode:
                  sanitizedDto.assemblyStatusCode === null
                    ? null
                    : sanitizedDto.assemblyStatusCode.trim(),
              }
            : {}),
          ...(sanitizedDto.storagePlaceId !== undefined ? { storagePlaceId: sanitizedDto.storagePlaceId } : {}),
          ...(sanitizedDto.orderStorage !== undefined
            ? { orderStorage: sanitizedDto.orderStorage === null ? null : sanitizedDto.orderStorage.trim() }
            : {}),
          ...(sanitizedDto.description !== undefined
            ? { description: sanitizedDto.description === null ? null : sanitizedDto.description.trim() }
            : {}),
          ...(sanitizedDto.productId !== undefined ? { productId: nextProduct.id } : {}),
          ...(sanitizedDto.productPrice !== undefined ? { productPrice: nextProductPrice.toFixed(2) } : {}),
          ...(sanitizedDto.quantity !== undefined ? { quantity: nextQuantity } : {}),
          productNameSnapshot: nextProduct.name,
          productStatusNameSnapshot: PRODUCT_AVAILABILITY_LABELS[nextProduct.availabilityStatus],
          orderSourceNameSnapshot: nextProduct.orderSource?.name ?? null,
          manufacturerNameSnapshot: nextProduct.manufacturer.name,
          activeSubstanceNameSnapshot: nextProduct.activeSubstance.name,
          itemsTotalPrice: totals.itemsTotalPrice,
          totalPrice: totals.totalPrice,
          remainingAmount: totals.remainingAmount,
          prepaymentDate: paymentDates.prepaymentDate,
          paymentDate: paymentDates.paymentDate,
          ...(nextActionStatus.setAssemblyDateOnSet && !currentOrder.assemblyDate ? { assemblyDate: now } : {}),
        },
        include: ORDER_FULL_INCLUDE,
      });

      if ((sanitizedDto.productId !== undefined || sanitizedDto.quantity !== undefined) && currentOrder.actionStatus.reserveOnSet) {
        if (currentOrder.productId !== nextProduct.id) {
          await this.orderInventoryService.release(tx, {
            productId: currentOrder.productId,
            quantity: currentOrder.quantity,
            orderId: currentOrder.id,
            currentUserId,
          });
          await this.orderInventoryService.reserve(tx, {
            product: nextProduct,
            quantity: nextQuantity,
            orderId: currentOrder.id,
            currentUserId,
          });
        } else {
          const delta = nextQuantity - currentOrder.quantity;
          if (delta > 0) {
            await this.orderInventoryService.reserve(tx, {
              product: nextProduct,
              quantity: delta,
              orderId: currentOrder.id,
              currentUserId,
            });
          } else if (delta < 0) {
            await this.orderInventoryService.release(tx, {
              productId: currentOrder.productId,
              quantity: Math.abs(delta),
              orderId: currentOrder.id,
              currentUserId,
            });
          }
        }
      }

      await this.applyStatusInventoryAutomation(tx, {
        orderId: currentOrder.id,
        currentUserId,
        quantity: nextQuantity,
        productId: nextProduct.id,
        previousActionStatus: currentOrder.actionStatus,
        nextActionStatus,
      });
      return updated;
    });
  }

  async delete(id: number, currentUserId: number) {
    return this.withOrderTransaction(async (tx) => {
        const order: FullOrder = await this.loadOrderFullOrThrow(tx, id);

        if (order.actionStatus.reserveOnSet) {
          await this.orderInventoryService.release(tx, {
            productId: order.productId,
            quantity: order.quantity,
            orderId: id,
            currentUserId,
          });
        }

        await tx.productStockMovement.deleteMany({ where: { orderId: id } });

        await tx.order.delete({ where: { id } });

        return id;
      });
  }

  async updateBatchStatuses(dto: UpdateOrdersBatchStatusDto, roleCode: string) {
    const policy = await this.accessPolicy.getAccessPolicy(roleCode);
    const allowed = new Set<OrderUpdateFieldKey>(policy.orders.editableFields);

    const patchEntries = [
      ['actionStatusCode', dto.actionStatusCode],
      ['stateStatusCode', dto.stateStatusCode],
      ['paymentStatus', dto.paymentStatus],
    ].filter(([, value]) => value !== undefined) as Array<
      ['actionStatusCode' | 'stateStatusCode' | 'paymentStatus', string]
    >;

    if (patchEntries.length !== 1) {
      throw new BadRequestException('Нужно передать ровно одно поле статуса для batch-обновления');
    }

    const [field, value] = patchEntries[0];
    if (!allowed.has(field)) {
      throw new ForbiddenException(`Недостаточно прав для изменения поля: ${field}`);
    }

    let actionStatus: OrderStatusConfig | null = null;
    if (field === 'actionStatusCode') {
      actionStatus = await this.getStatusConfig(this.prisma, value, 'ACTION');
    } else if (field === 'stateStatusCode') {
      await this.getStatusConfig(this.prisma, value, 'STATE');
    }

    const orders = await this.prisma.order.findMany({
      where: { id: { in: dto.ids } },
      include: ORDER_FULL_INCLUDE,
    });
    let updatedCount = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const order of orders) {
        await tx.order.update({
          where: { id: order.id },
          data: {
            [field]: value,
            ...(field === 'paymentStatus'
              ? this.resolvePaymentDates(
                  {
                    paymentDate: order.paymentDate,
                    prepaymentDate: order.prepaymentDate,
                    paymentStatus: order.paymentStatus,
                  },
                  value as PaymentStatusCode,
                  new Date(),
                )
              : {}),
          } as Prisma.OrderUpdateInput,
        });
        if (field === 'actionStatusCode' && actionStatus) {
          await this.applyStatusInventoryAutomation(tx, {
            orderId: order.id,
            currentUserId: undefined,
            quantity: order.quantity,
            productId: order.productId,
            previousActionStatus: order.actionStatus,
            nextActionStatus: actionStatus,
          });
        }
        updatedCount += 1;
      }
    });
    return { updatedCount };
  }

  private calculateOrderTotals(
    productPrice: Decimal.Value,
    quantity: number,
    deliveryPriceInput?: Decimal.Value,
    paymentStatus?: PaymentStatusCode,
  ) {
    const deliveryPrice = this.toMoney(deliveryPriceInput ?? 0);
    const itemPrice = this.toMoney(productPrice);

    if (deliveryPrice.isNegative()) {
      throw new BadRequestException('Цена доставки не может быть отрицательной');
    }
    const itemsTotalPrice = this.toMoney(itemPrice.mul(quantity));
    const totalPrice = itemsTotalPrice.plus(deliveryPrice);
    const paidRatio =
      paymentStatus === PaymentStatusCode.PAID ? new Decimal(1) : paymentStatus === PaymentStatusCode.PREPAID_50 ? new Decimal(0.5) : new Decimal(0);
    const paidAmount = this.toMoney(totalPrice.mul(paidRatio));

    if (
      deliveryPrice.greaterThan(OrdersService.MAX_MONEY) ||
      itemsTotalPrice.greaterThan(OrdersService.MAX_MONEY) ||
      totalPrice.greaterThan(OrdersService.MAX_MONEY)
    ) {
      throw new BadRequestException('Сумма заказа превышает допустимый лимит 99 999 999.99');
    }
    const remainingAmount = totalPrice.minus(paidAmount);

    return {
      deliveryPrice: deliveryPrice.toFixed(2),
      itemsTotalPrice: itemsTotalPrice.toFixed(2),
      totalPrice: totalPrice.toFixed(2),
      remainingAmount: remainingAmount.toFixed(2),
    };
  }

  private toMoney(value: Prisma.Decimal | Decimal | number | string) {
    return new Decimal(value as Decimal.Value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  private buildOrderBy(
    query: OrderQueryDto,
  ): Prisma.OrderOrderByWithRelationInput | Prisma.OrderOrderByWithRelationInput[] {
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    // Default "newest first" should be by creation time.
    // Add a secondary sort by id for stable ordering when timestamps are equal.
    if (sortBy === 'createdAt') {
      return [{ createdAt: sortOrder }, { id: 'desc' }];
    }
    if (sortBy === 'updatedAt') {
      return [{ updatedAt: sortOrder }, { id: 'desc' }];
    }
    if (sortBy === 'totalPrice') {
      return [{ totalPrice: sortOrder }, { id: 'desc' }];
    }
    if (sortBy === 'remainingAmount') {
      return [{ remainingAmount: sortOrder }, { id: 'desc' }];
    }
    if (sortBy === 'actionStatusCode') {
      return [
        { actionStatus: { sortOrder } },
        { actionStatus: { name: sortOrder } },
        { id: 'desc' },
      ];
    }
    if (sortBy === 'stateStatusCode') {
      return [
        { stateStatus: { sortOrder } },
        { stateStatus: { name: sortOrder } },
        { id: 'desc' },
      ];
    }
    if (sortBy === 'assemblyStatusCode') {
      return [
        { assemblyStatus: { sortOrder } },
        { assemblyStatus: { name: sortOrder } },
        { id: 'desc' },
      ];
    }

    return [{ createdAt: 'desc' }, { id: 'desc' }];
  }

  private buildOrderWhere(
    query: OrderQueryDto,
    allowedTableGroups: OrderTableGroupKey[],
  ): Prisma.OrderWhereInput {
    const where: Record<string, unknown> = {};

    if (query.clientPhone !== undefined) {
      where.clientPhone = { contains: query.clientPhone, mode: 'insensitive' };
    }
    if (query.city !== undefined) {
      where.city = { contains: query.city, mode: 'insensitive' };
    }
    if (query.tableGroup !== undefined) {
      (where as Record<string, unknown>).stateStatus = {
        tableGroup: query.tableGroup as OrderTableGroupKey,
      };
    }
    if (query.paymentStatus !== undefined) {
      where.paymentStatus = query.paymentStatus;
    }
    if (query.storagePlaceId !== undefined) {
      where.storagePlaceId = query.storagePlaceId;
    }

    const orderStatusesFilter = this.resolveOrderStatusesFilter(query);
    if (orderStatusesFilter) {
      where.actionStatusCode = { in: orderStatusesFilter };
    }

    const createdAtFilter = this.buildCreatedAtFilter(query.dateFrom, query.dateTo);
    if (createdAtFilter) {
      where.createdAt = createdAtFilter;
    }

    if (query.search) {
      where.OR = [
        { clientPhone: { contains: query.search, mode: 'insensitive' } },
        { clientFullName: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
        { address: { contains: query.search, mode: 'insensitive' } },
        { productNameSnapshot: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (allowedTableGroups.length > 0) {
      const tableGroupRestriction: Prisma.OrderWhereInput = {};
      (tableGroupRestriction as Record<string, unknown>).stateStatus = {
        tableGroup: {
          in: allowedTableGroups,
        },
      };
      if (Array.isArray(where.AND)) {
        where.AND.push(tableGroupRestriction);
      } else if (where.AND) {
        where.AND = [where.AND as Prisma.OrderWhereInput, tableGroupRestriction];
      } else {
        where.AND = [tableGroupRestriction];
      }
    }

    return where as Prisma.OrderWhereInput;
  }

  private resolveOrderStatusesFilter(query: OrderQueryDto): string[] | undefined {
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

  private async loadOrderFullOrThrow(
    db: PrismaService | Prisma.TransactionClient,
    orderId: number,
  ): Promise<FullOrder> {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: ORDER_FULL_INCLUDE,
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    return order;
  }

  private applyOrderFilterPolicy(
    query: OrderQueryDto,
    visibleFilters: OrderFilterKey[],
    fixedFilters: FixedOrderFilters,
    allowedTableGroups: OrderTableGroupKey[],
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

    if (fixedFilters.city !== undefined) {
      filtered.city = fixedFilters.city;
    }
    if (fixedFilters.orderStatus !== undefined) {
      filtered.orderStatus = fixedFilters.orderStatus as OrderQueryDto['orderStatus'];
    }
    if (fixedFilters.tableGroup !== undefined) {
      filtered.tableGroup = fixedFilters.tableGroup;
    }

    if (
      filtered.tableGroup !== undefined &&
      allowedTableGroups.length > 0 &&
      !allowedTableGroups.includes(filtered.tableGroup as OrderTableGroupKey)
    ) {
      filtered.tableGroup = undefined;
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

  private async getStatusConfig(
    db: PrismaService | Prisma.TransactionClient,
    code: string,
    type: 'ACTION' | 'STATE',
  ) {
    const statusDelegate = (
      db as unknown as {
        orderStatusConfig: {
          findFirst: (args: {
            where: { code: string; type: 'ACTION' | 'STATE'; isActive: boolean };
          }) => Promise<OrderStatusConfig | null>;
        };
      }
    ).orderStatusConfig;

    const status = await statusDelegate.findFirst({
      where: { code, type, isActive: true },
    });
    if (!status) {
      throw new NotFoundException(`Статус ${code} (${type}) не найден`);
    }
    return status;
  }

  private resolvePaymentDates(
    current:
      | {
          paymentStatus: PaymentStatusCode;
          prepaymentDate: Date | null;
          paymentDate: Date | null;
        }
      | undefined,
    nextStatus: PaymentStatusCode,
    now: Date,
  ) {
    if (nextStatus === PaymentStatusCode.UNPAID) {
      return { prepaymentDate: null, paymentDate: null };
    }
    if (nextStatus === PaymentStatusCode.PREPAID_50) {
      return {
        prepaymentDate: current?.prepaymentDate ?? now,
        paymentDate: null,
      };
    }
    return {
      prepaymentDate: current?.prepaymentDate ?? now,
      paymentDate: current?.paymentDate ?? now,
    };
  }

  private async applyStatusInventoryAutomation(
    tx: Prisma.TransactionClient,
    params: {
      orderId: number;
      productId: number;
      quantity: number;
      currentUserId?: number;
      previousActionStatus: OrderStatusConfig | null;
      nextActionStatus: OrderStatusConfig;
    },
  ) {
    const wasReserve = params.previousActionStatus?.reserveOnSet ?? false;
    const nowReserve = params.nextActionStatus.reserveOnSet;
    if (!wasReserve && nowReserve) {
      const product = await tx.product.findUniqueOrThrow({ where: { id: params.productId } });
      await this.orderInventoryService.reserve(tx, {
        product,
        quantity: params.quantity,
        orderId: params.orderId,
        currentUserId: params.currentUserId,
      });
    }
    if (wasReserve && !nowReserve) {
      await this.orderInventoryService.release(tx, {
        productId: params.productId,
        quantity: params.quantity,
        orderId: params.orderId,
        currentUserId: params.currentUserId,
      });
    }

    const wasWriteOff = params.previousActionStatus?.writeOffOnSet ?? false;
    const nowWriteOff = params.nextActionStatus.writeOffOnSet;
    if (!wasWriteOff && nowWriteOff) {
      await this.orderInventoryService.writeOff(tx, {
        productId: params.productId,
        quantity: params.quantity,
        orderId: params.orderId,
        currentUserId: params.currentUserId,
      });
    }
  }

  private withOrderTransaction<T>(
    run: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma
      .$transaction(async (tx) => run(tx), { timeout: 15000 })
      .catch((error) => this.prismaErrorMapper.rethrow(error));
  }
}
