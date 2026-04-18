import { IntersectionType, OmitType, PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Min, ValidateIf } from 'class-validator';
import { CreateProductDto } from './create-product.dto';

class UpdateProductStoragePlaceDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    return Number(value);
  })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsInt()
  @Min(1)
  storagePlaceId?: number | null;
}

export class UpdateProductDto extends IntersectionType(
  PartialType(OmitType(CreateProductDto, ['storagePlaceId'] as const)),
  UpdateProductStoragePlaceDto,
) {}
