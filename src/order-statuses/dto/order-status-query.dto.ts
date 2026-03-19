import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class OrderStatusQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

}
