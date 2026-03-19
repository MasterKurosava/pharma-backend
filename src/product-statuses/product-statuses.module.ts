import { Module } from '@nestjs/common';
import { ProductStatusesController } from './product-statuses.controller';
import { ProductStatusesService } from './product-statuses.service';

@Module({
  controllers: [ProductStatusesController],
  providers: [ProductStatusesService],
  exports: [ProductStatusesService],
})
export class ProductStatusesModule {}
