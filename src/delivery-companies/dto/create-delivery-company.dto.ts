import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateDeliveryCompanyDto {
  @IsString()
  @Length(1, 255)
  name!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

}
