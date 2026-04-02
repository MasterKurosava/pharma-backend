import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { DeliveryStatusCode, OrderStatusCode, PaymentStatusCode } from '@prisma/client';
import { CreateOrderItemDto } from './items/create-order-item.dto';

export class CreateOrderDto {
  @IsString()
  @Length(3, 50)
  clientPhone!: string;

  @IsInt()
  @Min(1)
  countryId!: number;

  @IsString()
  @Length(1, 120)
  city!: string;

  @IsString()
  @Length(1, 1000)
  address!: string;

  @IsEnum(DeliveryStatusCode)
  deliveryStatus!: DeliveryStatusCode;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  deliveryPrice?: number;

  @IsEnum(PaymentStatusCode)
  paymentStatus!: PaymentStatusCode;

  @IsEnum(OrderStatusCode)
  orderStatus!: OrderStatusCode;

  @IsOptional()
  @IsInt()
  @Min(1)
  storagePlaceId?: number;

  @IsOptional()
  @IsString()
  @Length(1, 2000)
  description?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  paidAmount?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
