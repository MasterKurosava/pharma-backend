import { Module } from '@nestjs/common';
import { OrdersController } from './controllers/orders.controller';
import { OrdersService } from './services/orders.service';
import { OrderPrecheckService } from './services/order-precheck.service';
import { OrderInventoryService } from './services/order-inventory.service';
import { AccessPolicyService } from '../common/access/access-policy.service';

@Module({
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrderPrecheckService,
    OrderInventoryService,
    AccessPolicyService,
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
