type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type ApiResult<T = unknown> = {
  status: number;
  data: T | null;
  rawText: string;
};

type CleanupEntity = {
  path: string;
  id: number;
};

type Ctx = {
  baseUrl: string;
  token: string;
  ids: {
    manufacturerId: number;
    activeSubstanceId: number;
    sourceId: number;
    storagePlaceId: number;
    productId: number;
    orderId: number;
    roleId: number;
    actionStatusId: number;
    stateStatusId: number;
  };
  codes: {
    actionStatusCode: string;
    stateStatusCode: string;
  };
  created: CleanupEntity[];
};

type RoleItem = {
  id: number;
  code: string;
  name: string;
  isSystem: boolean;
  allowedRoutes: string[];
  allowedOrderTableGroups: string[];
};

type StatusConfigItem = {
  id: number;
  code: string;
  type: 'ACTION' | 'STATE';
  name: string;
  color?: string | null;
  tableGroup?: string | null;
  reserveOnSet: boolean;
  writeOffOnSet: boolean;
  setAssemblyDateOnSet: boolean;
  sortOrder: number;
  isActive: boolean;
};

const BASE_URL = process.env.API_BASE_URL;
const LOGIN = process.env.TEST_ADMIN_LOGIN ?? 'admin';
const LOGIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? 'admin123';
const failures: string[] = [];

function randomSuffix() {
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function logOk(message: string) {
  console.log(`[OK] ${message}`);
}

function logError(message: string) {
  console.log(`[ERROR] ${message}`);
}

function ensureBaseUrl(): string {
  if (!BASE_URL) {
    throw new Error('API_BASE_URL is required');
  }
  const normalized = BASE_URL.replace(/\/+$/, '');
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
}

async function apiRequest<T = unknown>(
  method: HttpMethod,
  url: string,
  token?: string,
  body?: Record<string, unknown>,
): Promise<ApiResult<T>> {
  const response = await fetch(url, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const rawText = await response.text();
  let data: T | null = null;
  if (rawText) {
    try {
      data = JSON.parse(rawText) as T;
    } catch {
      data = null;
    }
  }
  return { status: response.status, data, rawText };
}

function expectStatus(result: ApiResult, expected: number, title: string): boolean {
  if (result.status === expected) {
    logOk(`${title} -> ${expected}`);
    return true;
  }
  logError(`${title} -> expected ${expected}, got ${result.status}. Body: ${result.rawText}`);
  failures.push(`${title}: expected ${expected}, got ${result.status}`);
  return false;
}

function expectStatusIn(result: ApiResult, expected: number[], title: string): boolean {
  if (expected.includes(result.status)) {
    logOk(`${title} -> ${result.status}`);
    return true;
  }
  logError(
    `${title} -> expected one of [${expected.join(', ')}], got ${result.status}. Body: ${result.rawText}`,
  );
  failures.push(`${title}: expected one of [${expected.join(', ')}], got ${result.status}`);
  return false;
}

function mustStatus(result: ApiResult, expected: number, title: string) {
  if (!expectStatus(result, expected, title)) {
    throw new Error(`${title}: expected ${expected}, got ${result.status}`);
  }
}

function rememberCreated(ctx: Ctx, path: string, id: number) {
  ctx.created.push({ path, id });
}

async function loginAndGetToken(baseUrl: string): Promise<string> {
  const res = await apiRequest<{ accessToken?: string }>('POST', `${baseUrl}/auth/login`, undefined, {
    login: LOGIN,
    password: LOGIN_PASSWORD,
  });
  mustStatus(res, 201, 'auth/login');
  if (!res.data?.accessToken) {
    throw new Error('auth/login: accessToken is missing');
  }
  return res.data.accessToken;
}

async function runAuthAndGuardChecks(ctx: Ctx) {
  console.log('\n--- auth/guards ---');
  expectStatusIn(await apiRequest('GET', `${ctx.baseUrl}/auth/me`), [401, 403], 'auth/me unauthorized');
  expectStatusIn(await apiRequest('GET', `${ctx.baseUrl}/roles`), [401, 403], 'roles unauthorized');
  mustStatus(await apiRequest('GET', `${ctx.baseUrl}/auth/me`, ctx.token), 200, 'auth/me authorized');
}

async function createEntity(
  ctx: Ctx,
  path: string,
  payload: Record<string, unknown>,
  title: string,
): Promise<number> {
  const res = await apiRequest<{ id?: number }>('POST', `${ctx.baseUrl}/${path}`, ctx.token, payload);
  mustStatus(res, 201, title);
  const id = res.data?.id;
  if (!id) throw new Error(`${title}: id is missing`);
  rememberCreated(ctx, path, id);
  return id;
}

async function runRoleChecks(ctx: Ctx) {
  console.log('\n--- roles ---');
  const list = await apiRequest<RoleItem[]>('GET', `${ctx.baseUrl}/roles`, ctx.token);
  mustStatus(list, 200, 'roles/list');
  for (const code of ['admin', 'manager', 'delivery_operator', 'assembler']) {
    const has = Boolean(list.data?.find((role) => role.code === code));
    if (!has) {
      failures.push(`roles/list: missing ${code}`);
      logError(`roles/list: missing ${code}`);
    } else {
      logOk(`roles/list: contains ${code}`);
    }
  }

  mustStatus(
    await apiRequest('POST', `${ctx.baseUrl}/roles`, ctx.token, {
      name: `Broken Role ${randomSuffix()}`,
      code: `broken_role_${Date.now()}`,
      allowedRoutes: [],
      allowedOrderTableGroups: [],
    }),
    400,
    'roles/create validation',
  );

  const suffix = randomSuffix();
  const created = await apiRequest<RoleItem>('POST', `${ctx.baseUrl}/roles`, ctx.token, {
    name: `Smoke Role ${suffix}`,
    code: `smoke_role_${Date.now()}`,
    allowedRoutes: ['/orders', '/products'],
    allowedOrderTableGroups: ['REQUESTS', 'PICKUP'],
  });
  mustStatus(created, 201, 'roles/create');
  if (!created.data?.id) throw new Error('roles/create: id is missing');
  ctx.ids.roleId = created.data.id;

  const updated = await apiRequest<RoleItem>(
    'PUT',
    `${ctx.baseUrl}/roles/${ctx.ids.roleId}`,
    ctx.token,
    {
      name: `Smoke Role Updated ${suffix}`,
      allowedRoutes: ['/orders', '/orders-requests'],
      allowedOrderTableGroups: ['REQUESTS'],
    },
  );
  mustStatus(updated, 200, 'roles/update');
  if (!updated.data?.allowedRoutes?.includes('/orders-requests')) {
    throw new Error('roles/update: allowedRoutes was not updated');
  }
  logOk('roles/update: allowedRoutes updated');

  mustStatus(await apiRequest('DELETE', `${ctx.baseUrl}/roles/${ctx.ids.roleId}`, ctx.token), 200, 'roles/delete');
}

async function runDictionaryChecks(ctx: Ctx) {
  console.log('\n--- dictionaries ---');
  const suffix = randomSuffix();

  ctx.ids.manufacturerId = await createEntity(
    ctx,
    'manufacturers',
    { name: `Smoke Manufacturer ${suffix}`, isActive: true },
    'manufacturers/create',
  );
  mustStatus(
    await apiRequest('GET', `${ctx.baseUrl}/manufacturers/${ctx.ids.manufacturerId}`, ctx.token),
    200,
    'manufacturers/get by id',
  );
  mustStatus(
    await apiRequest('PATCH', `${ctx.baseUrl}/manufacturers/${ctx.ids.manufacturerId}`, ctx.token, {
      name: `Smoke Manufacturer Patched ${suffix}`,
    }),
    200,
    'manufacturers/update',
  );

  ctx.ids.activeSubstanceId = await createEntity(
    ctx,
    'active-substances',
    { name: `Smoke Substance ${suffix}`, isActive: true },
    'active-substances/create',
  );
  mustStatus(
    await apiRequest('GET', `${ctx.baseUrl}/active-substances/${ctx.ids.activeSubstanceId}`, ctx.token),
    200,
    'active-substances/get by id',
  );

  ctx.ids.sourceId = await createEntity(
    ctx,
    'product-order-sources',
    { name: `Smoke Source ${suffix}`, color: '#2563eb', isActive: true },
    'product-order-sources/create',
  );
  mustStatus(
    await apiRequest('PATCH', `${ctx.baseUrl}/product-order-sources/${ctx.ids.sourceId}`, ctx.token, {
      color: '#0ea5e9',
    }),
    200,
    'product-order-sources/update',
  );

  ctx.ids.storagePlaceId = await createEntity(
    ctx,
    'storage-places',
    { name: `Smoke Storage ${suffix}`, description: 'Smoke storage', isActive: true },
    'storage-places/create',
  );
  mustStatus(
    await apiRequest('GET', `${ctx.baseUrl}/storage-places/${ctx.ids.storagePlaceId}`, ctx.token),
    200,
    'storage-places/get by id',
  );
}

async function runProductsChecks(ctx: Ctx) {
  console.log('\n--- products ---');
  const suffix = randomSuffix();

  mustStatus(
    await apiRequest('POST', `${ctx.baseUrl}/products`, ctx.token, {
      name: `Invalid Product ${suffix}`,
      manufacturerId: ctx.ids.manufacturerId,
      activeSubstanceId: ctx.ids.activeSubstanceId,
      availabilityStatus: 'ON_REQUEST',
      stockQuantity: 10,
      reservedQuantity: 1,
      price: 1200,
    }),
    400,
    'products/create invalid ON_REQUEST without source',
  );

  const created = await apiRequest<{ id?: number; storagePlaceId?: number | null }>('POST', `${ctx.baseUrl}/products`, ctx.token, {
    name: `Smoke Product ${suffix}`,
    description: 'smoke product',
    manufacturerId: ctx.ids.manufacturerId,
    activeSubstanceId: ctx.ids.activeSubstanceId,
    availabilityStatus: 'ON_REQUEST',
    productOrderSourceId: ctx.ids.sourceId,
    storagePlaceId: ctx.ids.storagePlaceId,
    stockQuantity: 40,
    reservedQuantity: 2,
    price: 2150.5,
    isActive: true,
  });
  mustStatus(created, 201, 'products/create');
  if (!created.data?.id) throw new Error('products/create: id is missing');
  if (created.data.storagePlaceId !== ctx.ids.storagePlaceId) {
    throw new Error('products/create: expected storagePlaceId on product');
  }
  ctx.ids.productId = created.data.id;
  rememberCreated(ctx, 'products', ctx.ids.productId);

  mustStatus(await apiRequest('GET', `${ctx.baseUrl}/products/${ctx.ids.productId}`, ctx.token), 200, 'products/get by id');
  mustStatus(await apiRequest('GET', `${ctx.baseUrl}/products?availabilityStatus=ON_REQUEST`, ctx.token), 200, 'products/list filtered');

  const clearedStorage = await apiRequest<{ storagePlaceId?: number | null }>(
    'PATCH',
    `${ctx.baseUrl}/products/${ctx.ids.productId}`,
    ctx.token,
    { storagePlaceId: null },
  );
  mustStatus(clearedStorage, 200, 'products/update clear storage place');
  if (clearedStorage.data?.storagePlaceId != null) {
    throw new Error('products/update: expected storagePlaceId null');
  }

  mustStatus(
    await apiRequest('PATCH', `${ctx.baseUrl}/products/${ctx.ids.productId}`, ctx.token, {
      stockQuantity: 1,
      reservedQuantity: 5,
    }),
    400,
    'products/update reserved > stock',
  );

  const sourceReset = await apiRequest<{ productOrderSourceId: number | null }>(
    'PATCH',
    `${ctx.baseUrl}/products/${ctx.ids.productId}`,
    ctx.token,
    {
      availabilityStatus: 'IN_STOCK',
      productOrderSourceId: ctx.ids.sourceId,
    },
  );
  mustStatus(sourceReset, 200, 'products/update IN_STOCK source reset');
  if (sourceReset.data?.productOrderSourceId !== null) {
    throw new Error('products/update IN_STOCK: expected productOrderSourceId to be null');
  }
  logOk('products/update IN_STOCK: source reset verified');
}

async function runOrderStatusesChecks(ctx: Ctx) {
  console.log('\n--- order-status-configs ---');
  const all = await apiRequest<StatusConfigItem[]>(
    'GET',
    `${ctx.baseUrl}/order-status-configs`,
    ctx.token,
  );
  mustStatus(all, 200, 'order-status-configs/list all');
  if (!all.data || all.data.length === 0) {
    throw new Error('order-status-configs/list all: empty');
  }

  const actionList = await apiRequest<StatusConfigItem[]>(
    'GET',
    `${ctx.baseUrl}/order-status-configs?type=ACTION`,
    ctx.token,
  );
  mustStatus(actionList, 200, 'order-status-configs/list ACTION');
  const actionStatus = actionList.data?.[0];
  if (!actionStatus) throw new Error('order-status-configs/list ACTION: empty');
  ctx.ids.actionStatusId = actionStatus.id;
  ctx.codes.actionStatusCode = actionStatus.code;

  const stateList = await apiRequest<StatusConfigItem[]>(
    'GET',
    `${ctx.baseUrl}/order-status-configs?type=STATE`,
    ctx.token,
  );
  mustStatus(stateList, 200, 'order-status-configs/list STATE');
  const stateStatus = stateList.data?.[0];
  if (!stateStatus) throw new Error('order-status-configs/list STATE: empty');
  ctx.ids.stateStatusId = stateStatus.id;
  ctx.codes.stateStatusCode = stateStatus.code;

  mustStatus(
    await apiRequest('GET', `${ctx.baseUrl}/order-status-configs/${ctx.ids.actionStatusId}`, ctx.token),
    200,
    'order-status-configs/get by id',
  );

  mustStatus(
    await apiRequest(
      'PATCH',
      `${ctx.baseUrl}/order-status-configs/${ctx.ids.actionStatusId}`,
      ctx.token,
      {
        name: actionStatus.name,
        color: actionStatus.color ?? '#16a34a',
        sortOrder: actionStatus.sortOrder,
        tableGroup: actionStatus.tableGroup ?? 'REQUESTS',
        reserveOnSet: actionStatus.reserveOnSet,
        writeOffOnSet: actionStatus.writeOffOnSet,
        setAssemblyDateOnSet: actionStatus.setAssemblyDateOnSet,
      },
    ),
    200,
    'order-status-configs/update ACTION',
  );
}

async function runOrdersChecks(ctx: Ctx) {
  console.log('\n--- orders ---');
  const suffix = randomSuffix();

  const orderCreate = await apiRequest<{ id?: number }>(
    'POST',
    `${ctx.baseUrl}/orders`,
    ctx.token,
    {
      clientPhone: `+7708${String(Date.now()).slice(-7)}`,
      clientFullName: `Smoke Client ${suffix}`,
      city: 'Алматы',
      address: `Smoke address ${suffix}`,
      deliveryPrice: 1500,
      paymentStatus: 'UNPAID',
      actionStatusCode: ctx.codes.actionStatusCode,
      stateStatusCode: ctx.codes.stateStatusCode,
      storagePlaceId: ctx.ids.storagePlaceId,
      description: `SMOKE_ORDER_${suffix}`,
      productId: ctx.ids.productId,
      quantity: 2,
    },
  );
  mustStatus(orderCreate, 201, 'orders/create');
  ctx.ids.orderId = orderCreate.data?.id ?? 0;
  if (!ctx.ids.orderId) throw new Error('orders/create: id is missing');
  rememberCreated(ctx, 'orders', ctx.ids.orderId);

  mustStatus(await apiRequest('GET', `${ctx.baseUrl}/orders/${ctx.ids.orderId}`, ctx.token), 200, 'orders/get by id');
  mustStatus(await apiRequest('GET', `${ctx.baseUrl}/orders/stats/summary`, ctx.token), 200, 'orders/stats summary');
  mustStatus(
    await apiRequest(
      'GET',
      `${ctx.baseUrl}/orders?page=1&pageSize=10&orderStatuses=${encodeURIComponent(ctx.codes.actionStatusCode)}&city=Алматы`,
      ctx.token,
    ),
    200,
    'orders/list with orderStatuses csv',
  );
  mustStatus(
    await apiRequest(
      'GET',
      `${ctx.baseUrl}/orders?orderStatuses[]=${encodeURIComponent(ctx.codes.actionStatusCode)}`,
      ctx.token,
    ),
    400,
    'orders/list rejects orderStatuses[] syntax',
  );

  mustStatus(
    await apiRequest('PATCH', `${ctx.baseUrl}/orders/${ctx.ids.orderId}`, ctx.token, {
      quantity: 0,
    }),
    400,
    'orders/update quantity zero rejected',
  );

  mustStatus(
    await apiRequest('PATCH', `${ctx.baseUrl}/orders/${ctx.ids.orderId}`, ctx.token, {
      paymentStatus: 'PREPAID_50',
      quantity: 1,
    }),
    200,
    'orders/update payment+quantity',
  );

  mustStatus(
    await apiRequest('PATCH', `${ctx.baseUrl}/orders/batch/status`, ctx.token, {
      ids: [ctx.ids.orderId],
      actionStatusCode: ctx.codes.actionStatusCode,
      stateStatusCode: ctx.codes.stateStatusCode,
    }),
    400,
    'orders/batch/status reject multiple fields',
  );

  mustStatus(
    await apiRequest('PATCH', `${ctx.baseUrl}/orders/batch/status`, ctx.token, {
      ids: [ctx.ids.orderId],
      stateStatusCode: ctx.codes.stateStatusCode,
    }),
    200,
    'orders/batch/status update state',
  );
}

async function cleanup(ctx: Ctx) {
  console.log('\n--- cleanup ---');
  for (const entity of [...ctx.created].reverse()) {
    const res = await apiRequest('DELETE', `${ctx.baseUrl}/${entity.path}/${entity.id}`, ctx.token);
    if (res.status === 200 || res.status === 404) {
      logOk(`cleanup ${entity.path}/${entity.id} -> ${res.status}`);
    } else {
      logError(`cleanup ${entity.path}/${entity.id} -> ${res.status} (${res.rawText})`);
      failures.push(`cleanup ${entity.path}/${entity.id}: ${res.status}`);
    }
  }
}

async function main() {
  const baseUrl = ensureBaseUrl();
  console.log(`Base URL: ${baseUrl}`);
  const token = await loginAndGetToken(baseUrl);
  logOk('auth/login success');

  const ctx: Ctx = {
    baseUrl,
    token,
    ids: {
      manufacturerId: 0,
      activeSubstanceId: 0,
      sourceId: 0,
      storagePlaceId: 0,
      productId: 0,
      orderId: 0,
      roleId: 0,
      actionStatusId: 0,
      stateStatusId: 0,
    },
    codes: {
      actionStatusCode: '',
      stateStatusCode: '',
    },
    created: [],
  };

  try {
    await runAuthAndGuardChecks(ctx);
    await runRoleChecks(ctx);
    await runDictionaryChecks(ctx);
    await runProductsChecks(ctx);
    await runOrderStatusesChecks(ctx);
    await runOrdersChecks(ctx);
  } finally {
    await cleanup(ctx);
  }

  if (failures.length > 0) {
    console.log('\nFailed checks:');
    for (const failure of failures) {
      console.log(` - ${failure}`);
    }
    throw new Error(`Smoke failed with ${failures.length} check(s)`);
  }
  console.log('\nSmoke finished successfully.');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Fatal: ${message}`);
  process.exit(1);
});
