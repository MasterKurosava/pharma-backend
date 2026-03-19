import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaErrorMapperService } from '../../common/prisma/prisma-error-mapper.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ORDER_STATUS_CODES } from '../constants/order-lifecycle.constants';
import { AddOrderItemDto } from '../dto/items/add-order-item.dto';
import { UpdateOrderItemQuantityDto } from '../dto/items/update-order-item-quantity.dto';
import { OrderHistoryService } from './order-history.service';
import { OrderInventoryService } from './order-inventory.service';
import { ORDER_FULL_INCLUDE } from '../order.constants';

type ProductForItemOperation = Prisma.ProductGetPayload<{
  include: {
    manufacturer: true;
    activeSubstance: true;
    status: true;
    orderSource: true;
  };
}>;

type EditableOrder = Prisma.OrderGetPayload<{
  include: {
    orderStatus: true;
  };
}>;

@Injectable()
export class OrderItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderHistoryService: OrderHistoryService,
    private readonly orderInventoryService: OrderInventoryService,
    private readonly prismaErrorMapper: PrismaErrorMapperService,
  ) {}

  async addItem(orderId: number, dto: AddOrderItemDto, currentUserId: number) {
    if (dto.quantity <= 0) {
      throw new BadRequestException('Количество товара должно быть больше нуля');
    }

    const updatedOrderId = await this.prisma.$transaction(async (tx) => {
      const order = await this.getEditableOrderOrThrow(tx, orderId);
      this.assertCanEditOrderItems(order);

      const product = await this.getProductForOrderItemOrThrow(tx, dto.productId);
      const existingItem = await tx.orderItem.findFirst({
        where: { orderId, productId: dto.productId },
      });

      const oldQuantity = existingItem?.quantity ?? 0;
      const newQuantity = oldQuantity + dto.quantity;
      const delta = newQuantity - oldQuantity;

      await this.applyReserveDelta(tx, product, delta, orderId, currentUserId);

      const pricePerItem = this.toMoney(product.price);
      const lineTotal = this.toMoney(pricePerItem.mul(newQuantity));

      if (existingItem) {
        await tx.orderItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: newQuantity,
            lineTotal: lineTotal.toFixed(2),
          },
        });
      } else {
        await tx.orderItem.create({
          data: {
            orderId,
            productId: product.id,
            quantity: newQuantity,
            pricePerItem: pricePerItem.toFixed(2),
            lineTotal: lineTotal.toFixed(2),
            productNameSnapshot: product.name,
            productStatusNameSnapshot: product.status.name,
            orderSourceNameSnapshot: product.orderSource?.name ?? null,
            manufacturerNameSnapshot: product.manufacturer.name,
            activeSubstanceNameSnapshot: product.activeSubstance.name,
          },
        });
      }

      const totals = await this.recalculateOrderTotals(tx, orderId);

      await this.orderHistoryService.logOrderItemAdded(tx, orderId, currentUserId, {
        productId: product.id,
        productName: product.name,
        oldQuantity,
        newQuantity,
        delta,
        itemsTotalPrice: totals.itemsTotalPrice,
        totalPrice: totals.totalPrice,
        remainingAmount: totals.remainingAmount,
      });

      return orderId;
    }, { timeout: 15000 }).catch((error) => this.prismaErrorMapper.rethrow(error));

    return this.loadOrderFull(this.prisma, updatedOrderId);
  }

  async changeQuantity(
    orderId: number,
    itemId: number,
    dto: UpdateOrderItemQuantityDto,
    currentUserId: number,
  ) {
    if (dto.quantity <= 0) {
      throw new BadRequestException('Количество товара должно быть больше нуля');
    }

    const updatedOrderId = await this.prisma.$transaction(async (tx) => {
      const order = await this.getEditableOrderOrThrow(tx, orderId);
      this.assertCanEditOrderItems(order);

      const item = await this.getOrderItemOrThrow(tx, orderId, itemId);
      const product = await this.getProductForOrderItemOrThrow(tx, item.productId);

      const oldQuantity = item.quantity;
      const newQuantity = dto.quantity;
      const delta = newQuantity - oldQuantity;

      await this.applyReserveDelta(tx, product, delta, orderId, currentUserId);

      await tx.orderItem.update({
        where: { id: item.id },
        data: {
          quantity: newQuantity,
          lineTotal: this.toMoney(item.pricePerItem).mul(newQuantity).toFixed(2),
        },
      });

      const totals = await this.recalculateOrderTotals(tx, orderId);

      await this.orderHistoryService.logOrderItemQuantityChanged(tx, orderId, currentUserId, {
        productId: product.id,
        productName: item.productNameSnapshot,
        oldQuantity,
        newQuantity,
        delta,
        itemsTotalPrice: totals.itemsTotalPrice,
        totalPrice: totals.totalPrice,
        remainingAmount: totals.remainingAmount,
      });

      return orderId;
    }, { timeout: 15000 }).catch((error) => this.prismaErrorMapper.rethrow(error));

    return this.loadOrderFull(this.prisma, updatedOrderId);
  }

  async removeItem(orderId: number, itemId: number, currentUserId: number) {
    const updatedOrderId = await this.prisma.$transaction(async (tx) => {
      const order = await this.getEditableOrderOrThrow(tx, orderId);
      this.assertCanEditOrderItems(order);

      const item = await this.getOrderItemOrThrow(tx, orderId, itemId);
      const itemsCount = await tx.orderItem.count({ where: { orderId } });
      if (itemsCount <= 1) {
        throw new BadRequestException(
          'Нельзя удалить последнюю позицию заказа. Используйте отдельный сценарий отмены заказа.',
        );
      }

      await this.applyReserveDelta(
        tx,
        null,
        -item.quantity,
        orderId,
        currentUserId,
        item.productId,
        item.productNameSnapshot,
      );
      await tx.orderItem.delete({ where: { id: item.id } });

      const totals = await this.recalculateOrderTotals(tx, orderId);

      await this.orderHistoryService.logOrderItemRemoved(tx, orderId, currentUserId, {
        productId: item.productId,
        productName: item.productNameSnapshot,
        removedQuantity: item.quantity,
        itemsTotalPrice: totals.itemsTotalPrice,
        totalPrice: totals.totalPrice,
        remainingAmount: totals.remainingAmount,
      });

      return orderId;
    }, { timeout: 15000 }).catch((error) => this.prismaErrorMapper.rethrow(error));

    return this.loadOrderFull(this.prisma, updatedOrderId);
  }

  private async getEditableOrderOrThrow(db: Prisma.TransactionClient, orderId: number) {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        orderStatus: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    return order;
  }

  private assertCanEditOrderItems(order: EditableOrder) {
    const statusCode = (order.orderStatus?.code ?? '').toUpperCase();
    const statusName = (order.orderStatus?.name ?? '').trim().toLowerCase();
    if (
      statusCode === ORDER_STATUS_CODES.CANCELLED ||
      statusCode === ORDER_STATUS_CODES.CLOSED ||
      statusName.includes('отмен') ||
      statusName.includes('закры')
    ) {
      throw new BadRequestException('Состав нельзя редактировать для финального статуса заказа');
    }
  }

  private async getOrderItemOrThrow(db: Prisma.TransactionClient, orderId: number, itemId: number) {
    const item = await db.orderItem.findFirst({
      where: { id: itemId, orderId },
    });

    if (!item) {
      throw new NotFoundException('Позиция заказа не найдена');
    }

    return item;
  }

  private async getProductForOrderItemOrThrow(
    db: Prisma.TransactionClient,
    productId: number,
  ): Promise<ProductForItemOperation> {
    const product = await db.product.findUnique({
      where: { id: productId },
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

    return product;
  }

  private async applyReserveDelta(
    db: Prisma.TransactionClient,
    product: ProductForItemOperation | null,
    delta: number,
    orderId: number,
    currentUserId: number,
    productIdInput?: number,
    productNameInput?: string,
  ) {
    if (delta === 0) {
      return;
    }

    const productId = product?.id ?? productIdInput;
    if (!productId) {
      throw new NotFoundException('Товар не найден');
    }

    if (delta > 0) {
      if (!product) {
        throw new BadRequestException('Для увеличения резерва требуется загруженный товар');
      }
      await this.orderInventoryService.reserve(db, {
        product,
        quantity: delta,
        orderId,
        currentUserId,
      });
      return;
    }

    await this.orderInventoryService.release(db, {
      productId,
      quantity: Math.abs(delta),
      orderId,
      currentUserId,
      productName: productNameInput,
    });
  }

  private async recalculateOrderTotals(db: Prisma.TransactionClient, orderId: number) {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    const itemsTotalPrice = order.items.reduce(
      (sum, item) => sum.plus(this.toMoney(item.lineTotal)),
      new Decimal(0),
    );
    const deliveryPrice = this.toMoney(order.deliveryPrice);
    const paidAmount = this.toMoney(order.paidAmount);
    const totalPrice = itemsTotalPrice.plus(deliveryPrice);

    if (paidAmount.greaterThan(totalPrice)) {
      throw new BadRequestException('Сумма оплаты не может быть больше суммы заказа');
    }

    const remainingAmount = totalPrice.minus(paidAmount);

    const updated = await db.order.update({
      where: { id: orderId },
      data: {
        itemsTotalPrice: itemsTotalPrice.toFixed(2),
        totalPrice: totalPrice.toFixed(2),
        remainingAmount: remainingAmount.toFixed(2),
      },
    });

    return {
      itemsTotalPrice: updated.itemsTotalPrice.toString(),
      totalPrice: updated.totalPrice.toString(),
      remainingAmount: updated.remainingAmount.toString(),
    };
  }

  private async loadOrderFull(db: PrismaService | Prisma.TransactionClient, orderId: number) {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: ORDER_FULL_INCLUDE,
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    return order;
  }

  private toMoney(value: Prisma.Decimal | Decimal | number | string) {
    return new Decimal(value as Decimal.Value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }
}

