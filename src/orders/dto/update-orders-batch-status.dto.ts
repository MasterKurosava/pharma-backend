import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { DeliveryStatusCode, OrderStatusCode, PaymentStatusCode } from '@prisma/client';

export class UpdateOrdersBatchStatusDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  ids!: number[];

  @IsOptional()
  @IsEnum(OrderStatusCode)
  orderStatus?: OrderStatusCode;

  @IsOptional()
  @IsEnum(DeliveryStatusCode)
  deliveryStatus?: DeliveryStatusCode;

  @IsOptional()
  @IsEnum(PaymentStatusCode)
  paymentStatus?: PaymentStatusCode;
}
