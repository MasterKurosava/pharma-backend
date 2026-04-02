import { IsString, MinLength } from 'class-validator';

export class UpdateRoleDto {
  @IsString()
  @MinLength(1)
  name!: string;
}
