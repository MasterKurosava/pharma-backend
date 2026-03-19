import { IsInt, Min } from 'class-validator';

export class ChangePaymentStatusDto {
  @IsInt()
  @Min(1)
  paymentStatusId!: number;
}
