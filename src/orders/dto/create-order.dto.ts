import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateOrderItemDto } from './items/create-order-item.dto';

export class CreateOrderDto {
  @IsInt()
  @Min(1)
  clientId!: number;

  @IsInt()
  @Min(1)
  countryId!: number;

  @IsInt()
  @Min(1)
  cityId!: number;

  @IsString()
  @Length(1, 1000)
  address!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  deliveryCompanyId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  deliveryTypeId?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  deliveryPrice?: number;

  @IsInt()
  @Min(1)
  paymentStatusId!: number;

  @IsInt()
  @Min(1)
  orderStatusId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  assemblyStatusId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  storagePlaceId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  responsibleUserId?: number;

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
