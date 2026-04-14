import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { PaymentStatusCode } from '@prisma/client';

export class UpdateOrdersBatchStatusDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  ids!: number[];

  @IsOptional()
  @IsString()
  @Length(1, 80)
  actionStatusCode?: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  stateStatusCode?: string;

  @IsOptional()
  @IsEnum(PaymentStatusCode)
  paymentStatus?: PaymentStatusCode;
}
