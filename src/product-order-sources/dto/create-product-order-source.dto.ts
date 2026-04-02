import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateProductOrderSourceDto {
  @IsString()
  @Length(1, 255)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  color?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

}
