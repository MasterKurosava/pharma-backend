import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateOrderPaymentDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  paidAmount!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  paymentStatusId?: number;
}
