import { OrderTableGroup } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateOrderStatusConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  color?: string | null;

  @IsOptional()
  @IsEnum(OrderTableGroup)
  tableGroup?: OrderTableGroup | null;

  @IsOptional()
  @IsBoolean()
  reserveOnSet?: boolean;

  @IsOptional()
  @IsBoolean()
  writeOffOnSet?: boolean;

  @IsOptional()
  @IsBoolean()
  setAssemblyDateOnSet?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
