import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class PaymentStatusQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

}
