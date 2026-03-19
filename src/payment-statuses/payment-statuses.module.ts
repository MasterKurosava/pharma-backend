import { Module } from '@nestjs/common';
import { PaymentStatusesController } from './payment-statuses.controller';
import { PaymentStatusesService } from './payment-statuses.service';

@Module({
  controllers: [PaymentStatusesController],
  providers: [PaymentStatusesService],
  exports: [PaymentStatusesService],
})
export class PaymentStatusesModule {}
