import { Module } from '@nestjs/common';
import { OrderStatusConfigsController } from './order-status-configs.controller';
import { OrderStatusConfigsService } from './order-status-configs.service';

@Module({
  controllers: [OrderStatusConfigsController],
  providers: [OrderStatusConfigsService],
  exports: [OrderStatusConfigsService],
})
export class OrderStatusConfigsModule {}
