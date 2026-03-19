import { Module } from '@nestjs/common';
import { OrderStatusesController } from './order-statuses.controller';
import { OrderStatusesService } from './order-statuses.service';

@Module({
  controllers: [OrderStatusesController],
  providers: [OrderStatusesService],
  exports: [OrderStatusesService],
})
export class OrderStatusesModule {}
