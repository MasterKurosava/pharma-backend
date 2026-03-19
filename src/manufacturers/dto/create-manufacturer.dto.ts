import { IsBoolean, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateManufacturerDto {
  @IsString()
  @Length(1, 255)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  countryId?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

}
