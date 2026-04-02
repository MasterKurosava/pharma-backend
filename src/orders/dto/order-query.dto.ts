import { Transform } from 'class-transformer';
import { DeliveryStatusCode, OrderStatusCode, PaymentStatusCode } from '@prisma/client';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class OrderQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  clientPhone?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? value : Number(value)))
  @IsInt()
  @Min(1)
  countryId?: number;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsEnum(PaymentStatusCode)
  paymentStatus?: PaymentStatusCode;

  @IsOptional()
  @IsEnum(OrderStatusCode)
  orderStatus?: OrderStatusCode;

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
  @IsEnum(OrderStatusCode, { each: true })
  orderStatuses?: OrderStatusCode[];

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? value : Number(value)))
  @IsInt()
  @Min(1)
  storagePlaceId?: number;

  @IsOptional()
  @IsEnum(DeliveryStatusCode)
  deliveryStatus?: DeliveryStatusCode;

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
  @IsIn(['createdAt', 'updatedAt', 'totalPrice', 'remainingAmount'])
  sortBy?: 'createdAt' | 'updatedAt' | 'totalPrice' | 'remainingAmount';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
