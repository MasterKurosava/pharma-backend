import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class ProductOrderSourceQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

}
