import { Injectable } from '@nestjs/common';
import { AccessPolicyDto, OrderFilterKey, OrderUpdateFieldKey } from './access-policy.types';

type RolePolicyTemplate = {
  allowedRoutes: string[];
  visibleFilters: OrderFilterKey[];
  editableFields: OrderUpdateFieldKey[];
};

const ALL_FILTERS: OrderFilterKey[] = [
  'search',
  'clientPhone',
  'countryId',
  'city',
  'paymentStatus',
  'orderStatus',
  'orderStatuses',
  'storagePlaceId',
  'deliveryStatus',
  'dateFrom',
  'dateTo',
];

const ALL_EDITABLE_FIELDS: OrderUpdateFieldKey[] = [
  'clientPhone',
  'countryId',
  'city',
  'address',
  'deliveryStatus',
  'deliveryPrice',
  'paymentStatus',
  'orderStatus',
  'storagePlaceId',
  'description',
  'paidAmount',
  'items',
];

const DELIVERY_EDITABLE_FIELDS: OrderUpdateFieldKey[] = [
  'orderStatus',
  'countryId',
  'city',
  'address',
  'deliveryPrice',
  'description',
];

const ASSEMBLER_EDITABLE_FIELDS: OrderUpdateFieldKey[] = [
  'storagePlaceId',
  'items',
  'deliveryStatus',
  'orderStatus',
  'description',
];

const MANAGER_ROUTES = [
  '/',
  '/orders',
  '/orders-delivery',
  '/orders-assembly',
  '/products',
  '/manufacturers',
  '/active-substances',
  '/product-order-sources',
  '/storage-places',
];

const ROLE_POLICIES: Record<string, RolePolicyTemplate> = {
  admin: {
    allowedRoutes: ['*'],
    visibleFilters: ALL_FILTERS,
    editableFields: ALL_EDITABLE_FIELDS,
  },
  manager: {
    allowedRoutes: MANAGER_ROUTES,
    visibleFilters: ALL_FILTERS,
    editableFields: ALL_EDITABLE_FIELDS,
  },
  delivery_operator: {
    allowedRoutes: ['/orders', '/orders-delivery', '/orders-assembly'],
    visibleFilters: ALL_FILTERS,
    editableFields: DELIVERY_EDITABLE_FIELDS,
  },
  assembler: {
    allowedRoutes: ['/orders', '/orders-delivery', '/orders-assembly', '/storage-places'],
    visibleFilters: ALL_FILTERS,
    editableFields: ASSEMBLER_EDITABLE_FIELDS,
  },
};

@Injectable()
export class AccessPolicyService {
  private getTemplate(roleCode: string | undefined | null): RolePolicyTemplate {
    const normalized = (roleCode ?? '').trim().toLowerCase();
    return ROLE_POLICIES[normalized] ?? ROLE_POLICIES.manager;
  }

  async getAccessPolicy(roleCode: string | undefined | null): Promise<AccessPolicyDto> {
    const template = this.getTemplate(roleCode);
    const fixedFilters = await this.resolveFixedFilters(template);
    return {
      role: (roleCode ?? '').trim().toLowerCase(),
      navigation: {
        allowedRoutes: template.allowedRoutes,
      },
      orders: {
        fixedFilters,
        visibleFilters: template.visibleFilters,
        editableFields: template.editableFields,
      },
    };
  }

  private async resolveFixedFilters(
    template: RolePolicyTemplate,
  ): Promise<{ countryId?: number; city?: string; orderStatus?: string; deliveryStatuses?: string[] }> {
    return {};
  }
}

