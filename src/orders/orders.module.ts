import { Module } from '@nestjs/common';
import { OrdersController } from './controllers/orders.controller';
import { OrdersService } from './services/orders.service';
import { OrderHistoryService } from './services/order-history.service';
import { OrderPrecheckService } from './services/order-precheck.service';
import { OrderInventoryService } from './services/order-inventory.service';

@Module({
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrderHistoryService,
    OrderPrecheckService,
    OrderInventoryService,
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
