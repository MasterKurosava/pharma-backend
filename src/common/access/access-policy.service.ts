import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AccessPolicyDto,
  OrderFilterKey,
  OrderTableGroupKey,
  OrderUpdateFieldKey,
} from './access-policy.types';

type RolePolicyTemplate = {
  allowedRoutes: string[];
  allowedTableGroups: OrderTableGroupKey[];
  visibleFilters: OrderFilterKey[];
  editableFields: OrderUpdateFieldKey[];
};

const ALL_TABLE_GROUPS: OrderTableGroupKey[] = [
  'REQUESTS',
  'PICKUP',
  'ALMATY_DELIVERY',
  'RK_DELIVERY',
  'ARCHIVE',
];

const ALL_FILTERS: OrderFilterKey[] = [
  'search',
  'clientPhone',
  'city',
  'tableGroup',
  'paymentStatus',
  'orderStatus',
  'orderStatuses',
  'storagePlaceId',
  'dateFrom',
  'dateTo',
];

const ALL_EDITABLE_FIELDS: OrderUpdateFieldKey[] = [
  'clientPhone',
  'clientFullName',
  'city',
  'address',
  'deliveryPrice',
  'paymentStatus',
  'actionStatusCode',
  'stateStatusCode',
  'assemblyStatusCode',
  'storagePlaceId',
  'orderStorage',
  'description',
  'productId',
  'productPrice',
  'quantity',
];

const DELIVERY_EDITABLE_FIELDS: OrderUpdateFieldKey[] = [
  'actionStatusCode',
  'stateStatusCode',
  'assemblyStatusCode',
  'city',
  'address',
  'deliveryPrice',
  'paymentStatus',
  'description',
  'orderStorage',
];

const ASSEMBLER_EDITABLE_FIELDS: OrderUpdateFieldKey[] = [
  'storagePlaceId',
  'productId',
  'quantity',
  'productPrice',
  'actionStatusCode',
  'stateStatusCode',
  'assemblyStatusCode',
  'description',
  'orderStorage',
];

const MANAGER_ROUTES = [
  '/',
  '/orders',
  '/orders-requests',
  '/orders-pickup',
  '/orders-almaty-delivery',
  '/orders-rk-delivery',
  '/orders-archive',
  '/products',
  '/manufacturers',
  '/active-substances',
  '/product-order-sources',
  '/storage-places',
  '/order-statuses-action',
  '/order-statuses-state',
];

const ROLE_POLICIES: Record<string, RolePolicyTemplate> = {
  admin: {
    allowedRoutes: ['*'],
    allowedTableGroups: ALL_TABLE_GROUPS,
    visibleFilters: ALL_FILTERS,
    editableFields: ALL_EDITABLE_FIELDS,
  },
  manager: {
    allowedRoutes: MANAGER_ROUTES,
    allowedTableGroups: ALL_TABLE_GROUPS,
    visibleFilters: ALL_FILTERS,
    editableFields: ALL_EDITABLE_FIELDS,
  },
  delivery_operator: {
    allowedRoutes: ['/orders-almaty-delivery', '/orders-rk-delivery'],
    allowedTableGroups: ['ALMATY_DELIVERY', 'RK_DELIVERY'],
    visibleFilters: ALL_FILTERS,
    editableFields: DELIVERY_EDITABLE_FIELDS,
  },
  assembler: {
    allowedRoutes: ['/orders-pickup', '/orders-almaty-delivery', '/orders-rk-delivery', '/storage-places'],
    allowedTableGroups: ['PICKUP', 'ALMATY_DELIVERY', 'RK_DELIVERY'],
    visibleFilters: ALL_FILTERS,
    editableFields: ASSEMBLER_EDITABLE_FIELDS,
  },
};

@Injectable()
export class AccessPolicyService {
  private readonly logger = new Logger(AccessPolicyService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async loadRoleAccess(
    roleCode: string,
  ): Promise<{ allowedRoutes: string[]; allowedOrderTableGroups: OrderTableGroupKey[] } | null> {
    type RoleAccessRecord = {
      allowedRoutes: string[];
      allowedOrderTableGroups: OrderTableGroupKey[];
    };

    return (this.prisma.role as unknown as {
      findUnique(args: unknown): Promise<RoleAccessRecord | null>;
    }).findUnique({
      where: { code: roleCode },
      select: {
        allowedRoutes: true,
        allowedOrderTableGroups: true,
      },
    });
  }

  private getTemplate(roleCode: string | undefined | null): RolePolicyTemplate {
    const normalized = (roleCode ?? '').trim().toLowerCase();
    return ROLE_POLICIES[normalized] ?? ROLE_POLICIES.manager;
  }

  async getAccessPolicy(roleCode: string | undefined | null): Promise<AccessPolicyDto> {
    let role:
      | {
          allowedRoutes: string[];
          allowedOrderTableGroups: OrderTableGroupKey[];
        }
      | null = null;
    try {
      role = await this.loadRoleAccess((roleCode ?? '').trim().toLowerCase());
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P1001'
      ) {
        this.logger.warn(
          'Database is temporarily unavailable while loading role access policy. Falling back to template policy.',
        );
      } else {
        this.logger.warn(
          'Failed to load role access policy from database, fallback template will be used.',
        );
      }
    }
    const template = this.getTemplate(roleCode);
    const fixedFilters = await this.resolveFixedFilters(template);
    const allowedRoutes = role?.allowedRoutes?.length ? role.allowedRoutes : template.allowedRoutes;
    const allowedTableGroups = role?.allowedOrderTableGroups?.length
      ? (role.allowedOrderTableGroups as OrderTableGroupKey[])
      : template.allowedTableGroups;

    return {
      role: (roleCode ?? '').trim().toLowerCase(),
      navigation: {
        allowedRoutes,
      },
      orders: {
        fixedFilters,
        allowedTableGroups,
        visibleFilters: template.visibleFilters,
        editableFields: template.editableFields,
      },
    };
  }

  private async resolveFixedFilters(
    template: RolePolicyTemplate,
  ): Promise<{ city?: string; orderStatus?: string; tableGroup?: OrderTableGroupKey }> {
    return {};
  }
}

