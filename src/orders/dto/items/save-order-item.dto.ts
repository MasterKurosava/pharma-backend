import { IsInt, IsOptional, Min } from 'class-validator';

export class SaveOrderItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number;

  @IsInt()
  @Min(1)
  productId!: number;

  @IsInt()
  @Min(1)
  quantity!: number;
}
