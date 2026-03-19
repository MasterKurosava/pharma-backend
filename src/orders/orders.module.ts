import { Module } from '@nestjs/common';
import { OrdersController } from './controllers/orders.controller';
import { OrderItemsController } from './controllers/order-items.controller';
import { OrderActionsController } from './controllers/order-actions.controller';
import { OrdersService } from './services/orders.service';
import { OrderItemsService } from './services/order-items.service';
import { OrderActionsService } from './services/order-actions.service';
import { OrderHistoryService } from './services/order-history.service';
import { OrderPrecheckService } from './services/order-precheck.service';
import { OrderInventoryService } from './services/order-inventory.service';

@Module({
  controllers: [OrdersController, OrderItemsController, OrderActionsController],
  providers: [
    OrdersService,
    OrderItemsService,
    OrderActionsService,
    OrderHistoryService,
    OrderPrecheckService,
    OrderInventoryService,
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
