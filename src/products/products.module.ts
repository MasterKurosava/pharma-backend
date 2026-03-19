import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductPrecheckService } from './product-precheck.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, ProductPrecheckService],
  exports: [ProductsService],
})
export class ProductsModule {}
