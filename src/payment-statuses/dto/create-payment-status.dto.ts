import { IsOptional, IsString, Length } from 'class-validator';

export class CreatePaymentStatusDto {
  @IsString()
  @Length(1, 255)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  color?: string;

}
