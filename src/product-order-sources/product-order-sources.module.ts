import { Module } from '@nestjs/common';
import { ProductOrderSourcesController } from './product-order-sources.controller';
import { ProductOrderSourcesService } from './product-order-sources.service';

@Module({
  controllers: [ProductOrderSourcesController],
  providers: [ProductOrderSourcesService],
  exports: [ProductOrderSourcesService],
})
export class ProductOrderSourcesModule {}
