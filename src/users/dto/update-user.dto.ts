import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  login?: string;

  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  role_id?: number;
}
