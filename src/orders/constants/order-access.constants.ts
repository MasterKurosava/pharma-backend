import { OrderFilterKey } from '../../common/access/access-policy.types';
import { OrderQueryDto } from '../dto/order-query.dto';

export const ORDER_FILTER_QUERY_MAP: Array<{ queryKey: keyof OrderQueryDto; filterKey: OrderFilterKey }> = [
  { queryKey: 'search', filterKey: 'search' },
  { queryKey: 'clientPhone', filterKey: 'clientPhone' },
  { queryKey: 'countryId', filterKey: 'countryId' },
  { queryKey: 'city', filterKey: 'city' },
  { queryKey: 'paymentStatus', filterKey: 'paymentStatus' },
  { queryKey: 'orderStatus', filterKey: 'orderStatus' },
  { queryKey: 'orderStatuses', filterKey: 'orderStatuses' },
  { queryKey: 'storagePlaceId', filterKey: 'storagePlaceId' },
  { queryKey: 'deliveryStatus', filterKey: 'deliveryStatus' },
  { queryKey: 'dateFrom', filterKey: 'dateFrom' },
  { queryKey: 'dateTo', filterKey: 'dateTo' },
];

