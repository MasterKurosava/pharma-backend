import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { CountriesModule } from './countries/countries.module';
import { ManufacturersModule } from './manufacturers/manufacturers.module';
import { ActiveSubstancesModule } from './active-substances/active-substances.module';
import { ProductOrderSourcesModule } from './product-order-sources/product-order-sources.module';
import { StoragePlacesModule } from './storage-places/storage-places.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { PrechecksModule } from './common/prechecks/prechecks.module';
import { PrismaCommonModule } from './common/prisma/prisma-common.module';
import { RolesGuard } from './common/guards/roles.guard';
import { AccessPolicyService } from './common/access/access-policy.service';
import { HealthController } from './health.controller';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      ttl: 60,
      max: 1000,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrechecksModule,
    PrismaCommonModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    CountriesModule,
    ManufacturersModule,
    ActiveSubstancesModule,
    ProductOrderSourcesModule,
    StoragePlacesModule,
    ProductsModule,
    OrdersModule,
  ],
  controllers: [HealthController],
  providers: [RolesGuard, AccessPolicyService],
})
export class AppModule {}