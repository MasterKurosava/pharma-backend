import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class ProductStatusQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

}
