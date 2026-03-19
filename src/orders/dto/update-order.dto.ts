import { IsInt, IsNumber, IsOptional, IsString, Length, Min, ValidateIf } from 'class-validator';

export class UpdateOrderDto {
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  address?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  deliveryCompanyId?: number | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  deliveryTypeId?: number | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  deliveryPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  paymentStatusId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  orderStatusId?: number;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  assemblyStatusId?: number | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  storagePlaceId?: number | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  responsibleUserId?: number | null;

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
