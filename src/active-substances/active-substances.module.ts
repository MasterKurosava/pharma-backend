import { Module } from '@nestjs/common';
import { ActiveSubstancesController } from './active-substances.controller';
import { ActiveSubstancesService } from './active-substances.service';

@Module({
  controllers: [ActiveSubstancesController],
  providers: [ActiveSubstancesService],
  exports: [ActiveSubstancesService],
})
export class ActiveSubstancesModule {}
