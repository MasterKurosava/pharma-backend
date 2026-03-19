import { IsBoolean, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateDeliveryTypeDto {
  @IsString()
  @Length(1, 255)
  name!: string;

  @IsInt()
  @Min(1)
  deliveryCompanyId: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

}
