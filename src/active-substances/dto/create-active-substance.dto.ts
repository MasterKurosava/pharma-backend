import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateActiveSubstanceDto {
  @IsString()
  @Length(1, 255)
  name!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

}
