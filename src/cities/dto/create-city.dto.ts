import { IsBoolean, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateCityDto {
  @IsInt()
  @Min(1)
  countryId!: number;

  @IsString()
  @Length(1, 255)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  region?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
