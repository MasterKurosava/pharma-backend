import { Transform } from 'class-transformer';
import { ProductAvailabilityStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @Length(1, 255)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 2000)
  description?: string;

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  imageUrl?: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  manufacturerId!: number;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  activeSubstanceId!: number;

  @IsEnum(ProductAvailabilityStatus)
  availabilityStatus!: ProductAvailabilityStatus;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    return Number(value);
  })
  @IsInt()
  @Min(1)
  productOrderSourceId?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    return Number(value);
  })
  @IsInt()
  @Min(1)
  productStoragePlaceId?: number;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  stockQuantity!: number;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  reservedQuantity!: number;

  @Transform(({ value }) => Number(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
