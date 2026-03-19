import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class AssemblyStatusQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

}
