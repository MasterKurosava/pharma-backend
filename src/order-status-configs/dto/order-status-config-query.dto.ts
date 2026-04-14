import { OrderStatusType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class OrderStatusConfigQueryDto {
  @IsOptional()
  @IsEnum(OrderStatusType)
  type?: OrderStatusType;

  @IsOptional()
  @IsString()
  search?: string;
}
