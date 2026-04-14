import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateManufacturerDto {
  @IsString()
  @Length(1, 255)
  name!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

}
