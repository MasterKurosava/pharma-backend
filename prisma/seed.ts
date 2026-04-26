import { OrderStatusType, OrderTableGroup, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ACTION_STATUSES = [
  { code: 'ACTION_IN_STOCK', name: 'И.Есть', color: '#2563eb', reserveOnSet: true, writeOffOnSet: false, setAssemblyDateOnSet: false },
  { code: 'ACTION_OUT_OF_STOCK', name: 'И.Нет', color: '#dc2626', reserveOnSet: false, writeOffOnSet: false, setAssemblyDateOnSet: false },
  { code: 'ACTION_MOSCOW', name: 'И.Мос', color: '#7c3aed', reserveOnSet: false, writeOffOnSet: false, setAssemblyDateOnSet: false },
  { code: 'ACTION_TURKEY', name: 'И.Тур', color: '#f59e0b', reserveOnSet: false, writeOffOnSet: false, setAssemblyDateOnSet: false },
  { code: 'ACTION_TC', name: 'И.ТС', color: '#0ea5e9', reserveOnSet: false, writeOffOnSet: false, setAssemblyDateOnSet: false },
  { code: 'ACTION_WAREHOUSE', name: 'И.Склад', color: '#0891b2', reserveOnSet: true, writeOffOnSet: false, setAssemblyDateOnSet: false },
  { code: 'ACTION_INDIA', name: 'И.Индия', color: '#16a34a', reserveOnSet: false, writeOffOnSet: false, setAssemblyDateOnSet: false },
  { code: 'ACTION_PLACE_ORDER', name: 'Оформите заказ', color: '#64748b', reserveOnSet: false, writeOffOnSet: false, setAssemblyDateOnSet: false },
  { code: 'ACTION_ORDER_MOSCOW', name: 'Закажите Мос', color: '#7c3aed', reserveOnSet: false, writeOffOnSet: false, setAssemblyDateOnSet: false },
  { code: 'ACTION_ORDER_TC', name: 'Закажите ТС', color: '#0ea5e9', reserveOnSet: false, writeOffOnSet: false, setAssemblyDateOnSet: false },
  { code: 'ACTION_ORDER_TURKEY', name: 'Закажите Тур', color: '#f59e0b', reserveOnSet: false, writeOffOnSet: false, setAssemblyDateOnSet: false },
  { code: 'ACTION_ORDER_INDIA', name: 'Закажите Инд', color: '#16a34a', reserveOnSet: false, writeOffOnSet: false, setAssemblyDateOnSet: false },
  { code: 'ACTION_ORDER_WAREHOUSE', name: 'Закажите Склад', color: '#0891b2', reserveOnSet: false, writeOffOnSet: false, setAssemblyDateOnSet: false },
  { code: 'ACTION_COLLECT_PICKUP', name: 'Соберите Самовывоз', color: '#2563eb', reserveOnSet: true, writeOffOnSet: false, setAssemblyDateOnSet: true },
  { code: 'ACTION_SELECT_YANDEX', name: 'Выберите Яндекс', color: '#f59e0b', reserveOnSet: false, writeOffOnSet: false, setAssemblyDateOnSet: false },
  { code: 'ACTION_CALLED_YANDEX', name: 'Вызвала Яндекс', color: '#d97706', reserveOnSet: false, writeOffOnSet: false, setAssemblyDateOnSet: false },
  { code: 'ACTION_COLLECT_ALMATY', name: 'Соберите Алматы', color: '#0ea5e9', reserveOnSet: true, writeOffOnSet: false, setAssemblyDateOnSet: true },
  { code: 'ACTION_COLLECT_PONY', name: 'Соберите Пони', color: '#8b5cf6', reserveOnSet: true, writeOffOnSet: false, setAssemblyDateOnSet: true },
  { code: 'ACTION_COLLECT_DOVAS', name: 'Соберите ДоВас', color: '#2563eb', reserveOnSet: true, writeOffOnSet: false, setAssemblyDateOnSet: true },
  { code: 'ACTION_COLLECT_INDRIVER', name: 'Соберите для Индрайвера', color: '#14b8a6', reserveOnSet: true, writeOffOnSet: false, setAssemblyDateOnSet: true },
  { code: 'ACTION_RECEIVED_REPLY', name: 'Поступило ответьте', color: '#64748b', reserveOnSet: false, writeOffOnSet: false, setAssemblyDateOnSet: false },
  { code: 'ACTION_NOTIFY_OTHER', name: 'Оповестите другое', color: '#64748b', reserveOnSet: false, writeOffOnSet: false, setAssemblyDateOnSet: false },
] as const;

const STATE_STATUSES = [
  { code: 'STATE_OFFER_ANALOGS', name: 'Предложите аналоги', color: '#2563eb', tableGroup: OrderTableGroup.REQUESTS },
  { code: 'STATE_WRITTEN_WO', name: 'Написали WO', color: '#7c3aed', tableGroup: OrderTableGroup.REQUESTS },
  { code: 'STATE_WRITTEN_WNG', name: 'Написали WNg', color: '#8b5cf6', tableGroup: OrderTableGroup.REQUESTS },
  { code: 'STATE_REACHED_PHONE', name: 'Дозвонились Тел', color: '#16a34a', tableGroup: OrderTableGroup.REQUESTS },
  { code: 'STATE_NOT_REACHED_PHONE', name: 'Недозвон Тел', color: '#dc2626', tableGroup: OrderTableGroup.REQUESTS },
  { code: 'STATE_PROCESSING_STARTED', name: 'Приступ. оформлению', color: '#0891b2', tableGroup: OrderTableGroup.REQUESTS },
  { code: 'STATE_ORDERED', name: 'Заказали', color: '#0ea5e9', tableGroup: OrderTableGroup.REQUESTS },
  { code: 'STATE_CC', name: 'СС', color: '#1d4ed8', tableGroup: OrderTableGroup.REQUESTS },
  { code: 'STATE_CCV', name: 'ССВ', color: '#4338ca', tableGroup: OrderTableGroup.REQUESTS },
  { code: 'STATE_CLOSED_PLUS', name: 'Закрыт+', color: '#16a34a', tableGroup: OrderTableGroup.ARCHIVE },
  { code: 'STATE_CLOSED_MINUS', name: 'Закрыт-', color: '#dc2626', tableGroup: OrderTableGroup.ARCHIVE },
] as const;

const ASSEMBLY_STATUSES = [
  { code: 'ASSEMBLY_PICKUP', name: 'Соберите самовывоз', color: '#2563eb' },
  { code: 'ASSEMBLY_YANDEX', name: 'Соберите Яндекс', color: '#f59e0b' },
  { code: 'ASSEMBLY_PONY', name: 'Соберите Пони', color: '#8b5cf6' },
  { code: 'ASSEMBLY_DOVAS', name: 'Соберите ДоВас', color: '#0ea5e9' },
] as const;

const ALL_ORDER_TABLE_GROUPS: OrderTableGroup[] = [
  OrderTableGroup.REQUESTS,
  OrderTableGroup.PICKUP,
  OrderTableGroup.ALMATY_DELIVERY,
  OrderTableGroup.RK_DELIVERY,
  OrderTableGroup.ARCHIVE,
];

const ROLE_ACCESS_DEFAULTS: Record<
  string,
  { allowedRoutes: string[]; allowedOrderTableGroups: OrderTableGroup[] }
> = {
  admin: {
    allowedRoutes: ['*'],
    allowedOrderTableGroups: ALL_ORDER_TABLE_GROUPS,
  },
  manager: {
    allowedRoutes: [
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
      '/product-storage-places',
      '/order-statuses-action',
      '/order-statuses-state',
    ],
    allowedOrderTableGroups: ALL_ORDER_TABLE_GROUPS,
  },
  delivery_operator: {
    allowedRoutes: ['/orders-almaty-delivery', '/orders-rk-delivery'],
    allowedOrderTableGroups: [
      OrderTableGroup.ALMATY_DELIVERY,
      OrderTableGroup.RK_DELIVERY,
    ],
  },
  assembler: {
    allowedRoutes: ['/orders-pickup', '/orders-almaty-delivery', '/orders-rk-delivery', '/storage-places'],
    allowedOrderTableGroups: [
      OrderTableGroup.PICKUP,
      OrderTableGroup.ALMATY_DELIVERY,
      OrderTableGroup.RK_DELIVERY,
    ],
  },
};

async function main() {
  const systemRoles: Array<{ code: string; name: string }> = [{ code: 'admin', name: 'Админ' }];

  for (const role of systemRoles) {
    const access = ROLE_ACCESS_DEFAULTS[role.code];
    await prisma.role.upsert({
      where: { code: role.code },
      update: {
        name: role.name,
        isSystem: true,
        allowedRoutes: access.allowedRoutes,
        allowedOrderTableGroups: access.allowedOrderTableGroups,
      },
      create: {
        code: role.code,
        name: role.name,
        isSystem: true,
        allowedRoutes: access.allowedRoutes,
        allowedOrderTableGroups: access.allowedOrderTableGroups,
      },
    });
  }

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { code: 'admin' } });
  await prisma.user.upsert({
    where: { login: 'admin' },
    update: {
      email: 'admin@example.com',
      passwordHash: '$2b$10$sNIQIHClmgN1q9NWpCD.NOXkEBRprsHTkmez4muWTRFY2.DfXPtwK',
      firstName: 'Admin',
      lastName: 'User',
      roleId: adminRole.id,
      isActive: true,
      deletedAt: null,
    },
    create: {
      login: 'admin',
      email: 'admin@example.com',
      passwordHash: '$2b$10$sNIQIHClmgN1q9NWpCD.NOXkEBRprsHTkmez4muWTRFY2.DfXPtwK',
      firstName: 'Admin',
      lastName: 'User',
      roleId: adminRole.id,
      isActive: true,
    },
  });

  for (let i = 0; i < ACTION_STATUSES.length; i += 1) {
    const s = ACTION_STATUSES[i];
    await prisma.orderStatusConfig.upsert({
      where: { code: s.code },
      update: {
        type: OrderStatusType.ACTION,
        name: s.name,
        color: s.color,
        tableGroups: [],
        reserveOnSet: s.reserveOnSet,
        writeOffOnSet: s.writeOffOnSet,
        setAssemblyDateOnSet: s.setAssemblyDateOnSet,
        isActive: true,
        sortOrder: i,
      },
      create: {
        code: s.code,
        type: OrderStatusType.ACTION,
        name: s.name,
        color: s.color,
        tableGroups: [],
        reserveOnSet: s.reserveOnSet,
        writeOffOnSet: s.writeOffOnSet,
        setAssemblyDateOnSet: s.setAssemblyDateOnSet,
        isActive: true,
        sortOrder: i,
      },
    });
  }

  for (let i = 0; i < STATE_STATUSES.length; i += 1) {
    const s = STATE_STATUSES[i];
    await prisma.orderStatusConfig.upsert({
      where: { code: s.code },
      update: {
        type: OrderStatusType.STATE,
        name: s.name,
        color: s.color,
        tableGroups: [s.tableGroup],
        reserveOnSet: false,
        writeOffOnSet: false,
        setAssemblyDateOnSet: false,
        isActive: true,
        sortOrder: i,
      },
      create: {
        code: s.code,
        type: OrderStatusType.STATE,
        name: s.name,
        color: s.color,
        tableGroups: [s.tableGroup],
        reserveOnSet: false,
        writeOffOnSet: false,
        setAssemblyDateOnSet: false,
        isActive: true,
        sortOrder: i,
      },
    });
  }

  for (let i = 0; i < ASSEMBLY_STATUSES.length; i += 1) {
    const s = ASSEMBLY_STATUSES[i];
    await prisma.assemblyStatus.upsert({
      where: { code: s.code },
      update: {
        name: s.name,
        color: s.color,
        isActive: true,
        sortOrder: i,
      },
      create: {
        code: s.code,
        name: s.name,
        color: s.color,
        isActive: true,
        sortOrder: i,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
