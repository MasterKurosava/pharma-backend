import { Module } from '@nestjs/common';
import { ProductStoragePlacesController } from './product-storage-places.controller';
import { ProductStoragePlacesService } from './product-storage-places.service';

@Module({
  controllers: [ProductStoragePlacesController],
  providers: [ProductStoragePlacesService],
  exports: [ProductStoragePlacesService],
})
export class ProductStoragePlacesModule {}
