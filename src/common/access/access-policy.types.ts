export type OrderFilterKey =
  | 'search'
  | 'clientPhone'
  | 'city'
  | 'tableGroup'
  | 'paymentStatus'
  | 'orderStatus'
  | 'orderStatuses'
  | 'storagePlaceId'
  | 'dateFrom'
  | 'dateTo';

export type OrderTableGroupKey =
  | 'REQUESTS'
  | 'PICKUP'
  | 'ALMATY_DELIVERY'
  | 'RK_DELIVERY'
  | 'ARCHIVE';

export type OrderUpdateFieldKey =
  | 'clientPhone'
  | 'clientFullName'
  | 'city'
  | 'address'
  | 'deliveryPrice'
  | 'paymentStatus'
  | 'actionStatusCode'
  | 'stateStatusCode'
  | 'assemblyStatusCode'
  | 'storagePlaceId'
  | 'orderStorage'
  | 'description'
  | 'productId'
  | 'productPrice'
  | 'quantity';

export type AccessPolicyDto = {
  role: string;
  navigation: {
    allowedRoutes: string[];
  };
  orders: {
    fixedFilters: {
      city?: string;
      orderStatus?: string;
      tableGroup?: OrderTableGroupKey;
    };
    allowedTableGroups: OrderTableGroupKey[];
    visibleFilters: OrderFilterKey[];
    editableFields: OrderUpdateFieldKey[];
  };
};

