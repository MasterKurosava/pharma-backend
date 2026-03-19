import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class ClientStatusQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

}
