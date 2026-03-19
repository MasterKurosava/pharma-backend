import { IsOptional, IsString, Length } from 'class-validator';

export class CreateAssemblyStatusDto {
  @IsString()
  @Length(1, 255)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  color?: string;

}
