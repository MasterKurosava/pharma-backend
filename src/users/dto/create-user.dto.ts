import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  login!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  @IsString()
  first_name!: string;

  @IsString()
  last_name!: string;

  @IsInt()
  @Min(1)
  role_id!: number;
}
