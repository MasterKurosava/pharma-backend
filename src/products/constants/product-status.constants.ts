import { ProductAvailabilityStatus } from '@prisma/client';

export const PRODUCT_AVAILABILITY_CODES = {
  OUT_OF_STOCK: ProductAvailabilityStatus.OUT_OF_STOCK,
  ON_REQUEST: ProductAvailabilityStatus.ON_REQUEST,
  IN_STOCK: ProductAvailabilityStatus.IN_STOCK,
} as const;

export const PRODUCT_AVAILABILITY_LABELS: Record<ProductAvailabilityStatus, string> = {
  [ProductAvailabilityStatus.OUT_OF_STOCK]: 'Нет в наличии',
  [ProductAvailabilityStatus.ON_REQUEST]: 'На заказ',
  [ProductAvailabilityStatus.IN_STOCK]: 'Есть',
};

