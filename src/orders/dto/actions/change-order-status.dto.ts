import { IsInt, Min } from 'class-validator';

export class ChangeOrderStatusDto {
  @IsInt()
  @Min(1)
  orderStatusId!: number;
}
