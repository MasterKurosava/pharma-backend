import { Module } from '@nestjs/common';
import { AssemblyStatusesController } from './assembly-statuses.controller';
import { AssemblyStatusesService } from './assembly-statuses.service';

@Module({
  controllers: [AssemblyStatusesController],
  providers: [AssemblyStatusesService],
  exports: [AssemblyStatusesService],
})
export class AssemblyStatusesModule {}
