import { Global, Module } from '@nestjs/common';
import { EntityExistenceService } from './entity-existence.service';

@Global()
@Module({
  providers: [EntityExistenceService],
  exports: [EntityExistenceService],
})
export class PrechecksModule {}

