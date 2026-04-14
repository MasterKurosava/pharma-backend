import { Transform } from 'class-transformer';
import { PaymentStatusCode } from '@prisma/client';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class OrderQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  clientPhone?: string;

  @IsOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  tableGroup?: string;

  @IsOptional()
  @IsEnum(PaymentStatusCode)
  paymentStatus?: PaymentStatusCode;

  @IsOptional()
  @IsString()
  orderStatus?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (Array.isArray(value)) {
      return value
        .flatMap((entry) => String(entry).split(','))
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
    return String(value)
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  })
  @IsString({ each: true })
  orderStatuses?: string[];

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? value : Number(value)))
  @IsInt()
  @Min(1)
  storagePlaceId?: number;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? value : Number(value)))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? value : Number(value)))
  @IsInt()
  @Min(1)
  pageSize?: number;

  @IsOptional()
  @IsString()
  @IsIn([
    'createdAt',
    'updatedAt',
    'totalPrice',
    'remainingAmount',
    'actionStatusCode',
    'stateStatusCode',
    'assemblyStatusCode',
  ])
  sortBy?:
    | 'createdAt'
    | 'updatedAt'
    | 'totalPrice'
    | 'remainingAmount'
    | 'actionStatusCode'
    | 'stateStatusCode'
    | 'assemblyStatusCode';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
