export type OrderFilterKey =
  | 'search'
  | 'clientPhone'
  | 'countryId'
  | 'city'
  | 'paymentStatus'
  | 'orderStatus'
  | 'orderStatuses'
  | 'storagePlaceId'
  | 'deliveryStatus'
  | 'dateFrom'
  | 'dateTo';

export type OrderUpdateFieldKey =
  | 'clientPhone'
  | 'countryId'
  | 'city'
  | 'address'
  | 'deliveryStatus'
  | 'deliveryPrice'
  | 'paymentStatus'
  | 'orderStatus'
  | 'storagePlaceId'
  | 'description'
  | 'paidAmount'
  | 'items';

export type AccessPolicyDto = {
  role: string;
  navigation: {
    allowedRoutes: string[];
  };
  orders: {
    fixedFilters: {
      countryId?: number;
      city?: string;
      orderStatus?: string;
      deliveryStatuses?: string[];
    };
    visibleFilters: OrderFilterKey[];
    editableFields: OrderUpdateFieldKey[];
  };
};

