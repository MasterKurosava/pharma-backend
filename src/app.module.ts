import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { CountriesModule } from './countries/countries.module';
import { ClientStatusesModule } from './client-statuses/client-statuses.module';
import { ManufacturersModule } from './manufacturers/manufacturers.module';
import { ActiveSubstancesModule } from './active-substances/active-substances.module';
import { ProductStatusesModule } from './product-statuses/product-statuses.module';
import { ProductOrderSourcesModule } from './product-order-sources/product-order-sources.module';
import { DeliveryCompaniesModule } from './delivery-companies/delivery-companies.module';
import { DeliveryTypesModule } from './delivery-types/delivery-types.module';
import { PaymentStatusesModule } from './payment-statuses/payment-statuses.module';
import { AssemblyStatusesModule } from './assembly-statuses/assembly-statuses.module';
import { OrderStatusesModule } from './order-statuses/order-statuses.module';
import { StoragePlacesModule } from './storage-places/storage-places.module';
import { CitiesModule } from './cities/cities.module';
import { ClientsModule } from './clients/clients.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { PrechecksModule } from './common/prechecks/prechecks.module';
import { PrismaCommonModule } from './common/prisma/prisma-common.module';

@Module({
  imports: [
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
    ClientStatusesModule,
    ManufacturersModule,
    ActiveSubstancesModule,
    ProductStatusesModule,
    ProductOrderSourcesModule,
    DeliveryCompaniesModule,
    DeliveryTypesModule,
    PaymentStatusesModule,
    AssemblyStatusesModule,
    OrderStatusesModule,
    StoragePlacesModule,
    CitiesModule,
    ClientsModule,
    ProductsModule,
    OrdersModule,
  ],
})
export class AppModule {}