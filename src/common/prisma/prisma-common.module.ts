import { Global, Module } from '@nestjs/common';
import { PrismaErrorMapperService } from './prisma-error-mapper.service';

@Global()
@Module({
  providers: [PrismaErrorMapperService],
  exports: [PrismaErrorMapperService],
})
export class PrismaCommonModule {}

