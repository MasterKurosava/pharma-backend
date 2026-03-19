import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateOrderItemDto {
  @IsInt()
  @Min(1)
  productId!: number;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  pricePerItem?: number;
}
