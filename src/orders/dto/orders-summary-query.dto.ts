import { Transform } from 'class-transformer';
import { IsDateString, IsOptional } from 'class-validator';

export class OrdersSummaryQueryDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? value : String(value).trim().toUpperCase()))
  statusCode?: string;
}
