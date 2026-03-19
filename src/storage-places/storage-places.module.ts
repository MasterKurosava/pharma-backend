import { Module } from '@nestjs/common';
import { StoragePlacesController } from './storage-places.controller';
import { StoragePlacesService } from './storage-places.service';

@Module({
  controllers: [StoragePlacesController],
  providers: [StoragePlacesService],
  exports: [StoragePlacesService],
})
export class StoragePlacesModule {}
