import { Module } from '@nestjs/common';
import { ClientStatusesController } from './client-statuses.controller';
import { ClientStatusesService } from './client-statuses.service';

@Module({
  controllers: [ClientStatusesController],
  providers: [ClientStatusesService],
  exports: [ClientStatusesService],
})
export class ClientStatusesModule {}
