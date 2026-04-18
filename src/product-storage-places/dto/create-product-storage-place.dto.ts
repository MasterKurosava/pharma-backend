import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateProductStoragePlaceDto {
  @IsString()
  @Length(1, 255)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
