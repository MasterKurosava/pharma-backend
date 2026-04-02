import { Transform } from 'class-transformer';
import { ProductAvailabilityStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ProductQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return value;
    return Number(value);
  })
  @IsInt()
  @Min(1)
  manufacturerId?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return value;
    return Number(value);
  })
  @IsInt()
  @Min(1)
  activeSubstanceId?: number;

  @IsOptional()
  @IsEnum(ProductAvailabilityStatus)
  availabilityStatus?: ProductAvailabilityStatus;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return value;
    return Number(value);
  })
  @IsInt()
  @Min(1)
  productOrderSourceId?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return value;
    return Number(value);
  })
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return value;
    return Number(value);
  })
  @IsInt()
  @Min(1)
  pageSize?: number;
}
