import { IntersectionType, OmitType, PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Min, ValidateIf } from 'class-validator';
import { CreateProductDto } from './create-product.dto';

class UpdateProductProductStoragePlaceDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    return Number(value);
  })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsInt()
  @Min(1)
  productStoragePlaceId?: number | null;
}

export class UpdateProductDto extends IntersectionType(
  PartialType(OmitType(CreateProductDto, ['productStoragePlaceId'] as const)),
  UpdateProductProductStoragePlaceDto,
) {}
