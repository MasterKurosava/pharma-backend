import { DeliveryStatusCode, OrderStatusCode, PaymentStatusCode } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Length, Min, ValidateIf } from 'class-validator';

export class UpdateOrderDto {
  @IsOptional()
  @IsString()
  @Length(3, 50)
  clientPhone?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  countryId?: number;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  city?: string;

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  address?: string;

  @IsOptional()
  @IsEnum(DeliveryStatusCode)
  deliveryStatus?: DeliveryStatusCode;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  deliveryPrice?: number;

  @IsOptional()
  @IsEnum(PaymentStatusCode)
  paymentStatus?: PaymentStatusCode;

  @IsOptional()
  @IsEnum(OrderStatusCode)
  orderStatus?: OrderStatusCode;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  storagePlaceId?: number | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Length(1, 2000)
  description?: string | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  paidAmount?: number;
}
