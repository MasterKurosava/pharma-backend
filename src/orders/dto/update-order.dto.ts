import { PaymentStatusCode } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Length, Min, ValidateIf } from 'class-validator';

export class UpdateOrderDto {
  @IsOptional()
  @IsString()
  @Length(3, 50)
  clientPhone?: string;

  @IsOptional()
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Length(1, 255)
  clientFullName?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Length(1, 120)
  city?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Length(1, 1000)
  address?: string | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  deliveryPrice?: number;

  @IsOptional()
  @IsEnum(PaymentStatusCode)
  paymentStatus?: PaymentStatusCode;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  actionStatusCode?: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  stateStatusCode?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Length(1, 80)
  assemblyStatusCode?: string | null;

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
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  productId?: number;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  productPrice?: number;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Length(1, 255)
  orderStorage?: string | null;
}
