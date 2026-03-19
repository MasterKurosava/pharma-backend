import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ClientQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return value;
    return Number(value);
  })
  @IsInt()
  @Min(1)
  clientStatusId?: number;
}
