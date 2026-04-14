import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { PaymentStatusCode } from '@prisma/client';

export class CreateOrderDto {
  @IsString()
  @Length(3, 50)
  clientPhone!: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  clientFullName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  city?: string;

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  address?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  deliveryPrice?: number;

  @IsOptional()
  @IsEnum(PaymentStatusCode)
  paymentStatus!: PaymentStatusCode;

  @IsString()
  @Length(1, 80)
  actionStatusCode!: string;

  @IsString()
  @Length(1, 80)
  stateStatusCode!: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  assemblyStatusCode?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  storagePlaceId?: number;

  @IsOptional()
  @IsString()
  @Length(1, 2000)
  description?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  orderStorage?: string;

  @IsInt()
  @Min(1)
  productId!: number;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  productPrice?: number;
}
