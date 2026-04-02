import { IsString, MinLength } from 'class-validator';

export class ChangeUserPasswordDto {
  @IsString()
  @MinLength(1)
  new_password!: string;
}
