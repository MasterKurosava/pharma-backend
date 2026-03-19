type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

type ApiResult<T = unknown> = {
  ok: boolean;
  status: number;
  data: T | null;
  rawText: string;
};

type EntityWithId = { id: number; name?: string; code?: string };

type TestContext = {
  baseUrl: string;
  token: string;
  ids: Record<string, number>;
  orderIds: number[];
};

const BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000/api';
const LOGIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? 'admin@example.com';
const LOGIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? 'admin123';

const colors = ['#1D4ED8', '#0EA5E9', '#0D9488', '#16A34A', '#EA580C', '#DC2626'];
const failures: string[] = [];

function randomSuffix() {
  return `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function logOk(message: string) {
  console.log(`[OK] ${message}`);
}

function logError(message: string) {
  console.log(`[ERROR] ${message}`);
}

async function apiRequest<T = unknown>(
  method: HttpMethod,
  url: string,
  token: string,
  body?: Record<string, unknown>,
): Promise<ApiResult<T>> {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
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

  return {
    ok: response.ok,
    status: response.status,
    data,
    rawText,
  };
}

function expectStatus(result: ApiResult, expectedStatus: number, title: string): boolean {
  if (result.status === expectedStatus) {
    logOk(`${title} -> status ${expectedStatus}`);
    return true;
  }
  logError(`${title} -> expected ${expectedStatus}, got ${result.status}. Body: ${result.rawText}`);
  return false;
}

function requireStatus(result: ApiResult, expectedStatus: number, title: string) {
  const ok = expectStatus(result, expectedStatus, title);
  if (!ok) {
    failures.push(`${title}: expected ${expectedStatus}, got ${result.status}`);
  }
  return ok;
}

function mustStatus(result: ApiResult, expectedStatus: number, title: string) {
  if (!requireStatus(result, expectedStatus, title)) {
    throw new Error(`${title}: expected ${expectedStatus}, got ${result.status}`);
  }
}

async function loginAndGetToken(baseUrl: string): Promise<string> {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: LOGIN_EMAIL,
      password: LOGIN_PASSWORD,
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(
      `Login failed with status ${response.status}. Body: ${raw}. ` +
        `Use TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD if needed.`,
    );
  }

  const parsed = JSON.parse(raw) as { accessToken?: string };
  if (!parsed.accessToken) {
    throw new Error('Login response does not contain accessToken');
  }
  return parsed.accessToken;
}

async function createEntity(
  ctx: TestContext,
  path: string,
  payload: Record<string, unknown>,
  title: string,
): Promise<number> {
  const res = await apiRequest<{ id?: number }>('POST', `${ctx.baseUrl}/${path}`, ctx.token, payload);
  mustStatus(res, 201, title);
  const id = (res.data as { id?: number } | null)?.id;
  if (!id) {
    throw new Error(`${title}: no id returned`);
  }
  return id;
}

async function getList<T = unknown>(ctx: TestContext, path: string): Promise<T> {
  const res = await apiRequest<T>('GET', `${ctx.baseUrl}/${path}`, ctx.token);
  mustStatus(res, 200, `${path}: GET list`);
  return res.data as T;
}

async function getSystemStatusIdByCode(ctx: TestContext, path: string, code: string): Promise<number> {
  const list = await getList<EntityWithId[]>(ctx, path);
  const found = list.find((x) => (x.code ?? '').toUpperCase() === code.toUpperCase());
  if (!found?.id) {
    throw new Error(`${path}: code ${code} not found`);
  }
  return found.id;
}

async function runDictionaryCrudSuite(
  ctx: TestContext,
  config: {
    name: string;
    path: string;
    createPayload: (s: string, c: TestContext) => Record<string, unknown>;
    updatePayload: (s: string, c: TestContext) => Record<string, unknown>;
    invalidPayload?: (s: string, c: TestContext) => Record<string, unknown>;
    invalidStatus?: number;
    storeIdAs?: string;
  },
) {
  const s = randomSuffix();
  const base = `${ctx.baseUrl}/${config.path}`;
  console.log(`\n--- ${config.name} ---`);

  requireStatus(await apiRequest('GET', base, ctx.token), 200, `${config.name}: GET list`);

  const createdId = await createEntity(ctx, config.path, config.createPayload(s, ctx), `${config.name}: POST create`);
  logOk(`${config.name}: created id=${createdId}`);

  if (config.storeIdAs) {
    ctx.ids[config.storeIdAs] = createdId;
  }

  requireStatus(await apiRequest('GET', `${base}/${createdId}`, ctx.token), 200, `${config.name}: GET by id`);
  requireStatus(
    await apiRequest('PATCH', `${base}/${createdId}`, ctx.token, config.updatePayload(s, ctx)),
    200,
    `${config.name}: PATCH update`,
  );
  requireStatus(
    await apiRequest('GET', `${base}/999999999`, ctx.token),
    404,
    `${config.name}: GET non-existing id`,
  );

  if (config.invalidPayload) {
    requireStatus(
      await apiRequest('POST', base, ctx.token, config.invalidPayload(s, ctx)),
      config.invalidStatus ?? 400,
      `${config.name}: invalid payload`,
    );
  }
}

async function runCitiesSuite(ctx: TestContext) {
  console.log('\n--- cities ---');
  const s = randomSuffix();

  const countryId = await createEntity(
    ctx,
    'countries',
    { name: `Country ${s}`, isActive: true },
    'countries: create for cities',
  );
  ctx.ids.countryId = countryId;

  const cityId = await createEntity(
    ctx,
    'cities',
    {
      countryId,
      name: `City ${s}`,
      region: `Region ${s}`,
      isActive: true,
    },
    'cities: create',
  );
  ctx.ids.cityId = cityId;

  requireStatus(
    await apiRequest('GET', `${ctx.baseUrl}/cities?countryId=${countryId}&search=City`, ctx.token),
    200,
    'cities: list filter countryId + search',
  );

  requireStatus(
    await apiRequest('PATCH', `${ctx.baseUrl}/cities/${cityId}`, ctx.token, {
      name: `City upd ${s}`,
      region: `Region upd ${s}`,
      isActive: false,
    }),
    200,
    'cities: patch',
  );

  requireStatus(
    await apiRequest('POST', `${ctx.baseUrl}/cities`, ctx.token, {
      countryId: 999999999,
      name: `City invalid ${s}`,
    }),
    404,
    'cities: invalid country',
  );
}

async function runClientsSuite(ctx: TestContext) {
  console.log('\n--- clients ---');
  const s = randomSuffix();
  const phone = `+99890${Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, '0')}`;

  const clientId = await createEntity(
    ctx,
    'clients',
    {
      name: `Client ${s}`,
      phone,
      clientStatusId: ctx.ids.clientStatusId,
      note: `Note ${s}`,
    },
    'clients: create',
  );
  ctx.ids.clientId = clientId;

  requireStatus(
    await apiRequest('GET', `${ctx.baseUrl}/clients?clientStatusId=${ctx.ids.clientStatusId}&search=Client`, ctx.token),
    200,
    'clients: list with filters',
  );

  requireStatus(
    await apiRequest('PATCH', `${ctx.baseUrl}/clients/${clientId}`, ctx.token, {
      name: `Client upd ${s}`,
      note: `Note upd ${s}`,
    }),
    200,
    'clients: patch',
  );

  requireStatus(
    await apiRequest('POST', `${ctx.baseUrl}/clients`, ctx.token, {
      name: `Client dup ${s}`,
      phone,
    }),
    409,
    'clients: duplicate phone',
  );
}

async function runProductsSuite(ctx: TestContext) {
  console.log('\n--- products ---');
  const s = randomSuffix();

  const productId = await createEntity(
    ctx,
    'products',
    {
      name: `Product ${s}`,
      description: `Product description ${s}`,
      manufacturerId: ctx.ids.manufacturerId,
      activeSubstanceId: ctx.ids.activeSubstanceId,
      productStatusId: ctx.ids.productStatusId,
      productOrderSourceId: ctx.ids.productOrderSourceId,
      stockQuantity: 30,
      reservedQuantity: 2,
      price: 18.75,
      isActive: true,
    },
    'products: create',
  );
  ctx.ids.productId = productId;

  requireStatus(
    await apiRequest(
      'GET',
      `${ctx.baseUrl}/products?manufacturerId=${ctx.ids.manufacturerId}&activeSubstanceId=${ctx.ids.activeSubstanceId}&search=Product`,
      ctx.token,
    ),
    200,
    'products: list with filters',
  );

  requireStatus(
    await apiRequest('PATCH', `${ctx.baseUrl}/products/${productId}`, ctx.token, {
      reservedQuantity: 3,
      stockQuantity: 35,
      price: 19.5,
    }),
    200,
    'products: patch',
  );

  requireStatus(
    await apiRequest('PATCH', `${ctx.baseUrl}/products/${productId}`, ctx.token, {
      stockQuantity: 2,
      reservedQuantity: 5,
    }),
    400,
    'products: invalid reserved > stock',
  );
}

async function runOrdersSuite(ctx: TestContext) {
  console.log('\n--- orders unified save ---');
  const s = randomSuffix();

  const createOrderRes = await apiRequest<{ id?: number }>('POST', `${ctx.baseUrl}/orders`, ctx.token, {
    clientId: ctx.ids.clientId,
    countryId: ctx.ids.countryId,
    cityId: ctx.ids.cityId,
    address: `Address ${s}`,
    deliveryCompanyId: ctx.ids.deliveryCompanyId,
    deliveryPrice: 7,
    paymentStatusId: ctx.ids.paymentStatusUnpaidId,
    orderStatusId: ctx.ids.orderStatusNewId,
    assemblyStatusId: ctx.ids.assemblyStatusId,
    storagePlaceId: ctx.ids.storagePlaceId,
    description: `Order ${s}`,
    paidAmount: 5,
    items: [{ productId: ctx.ids.productId, quantity: 2 }],
  });
  requireStatus(createOrderRes, 201, 'orders: create');
  const createdOrderId = (createOrderRes.data as { id?: number } | null)?.id;
  if (!createdOrderId) throw new Error('orders: create returned no id');
  ctx.orderIds.push(createdOrderId);

  requireStatus(
    await apiRequest(
      'GET',
      `${ctx.baseUrl}/orders?clientId=${ctx.ids.clientId}&page=1&pageSize=10&sortBy=createdAt&sortOrder=desc`,
      ctx.token,
    ),
    200,
    'orders: list pagination/sort/filter',
  );
  requireStatus(
    await apiRequest('GET', `${ctx.baseUrl}/orders/stats/summary`, ctx.token),
    200,
    'orders: stats summary',
  );
  requireStatus(
    await apiRequest('GET', `${ctx.baseUrl}/orders/${createdOrderId}`, ctx.token),
    200,
    'orders: get by id',
  );
  requireStatus(
    await apiRequest('GET', `${ctx.baseUrl}/orders/${createdOrderId}/history`, ctx.token),
    200,
    'orders: get history',
  );

  requireStatus(
    await apiRequest('PATCH', `${ctx.baseUrl}/orders/${createdOrderId}`, ctx.token, {
      address: `Address upd ${s}`,
      paidAmount: 10,
      deliveryPrice: 8,
      description: `Order upd ${s}`,
      items: [
        {
          productId: ctx.ids.productId,
          quantity: 3,
        },
      ],
    }),
    200,
    'orders: unified patch (fields + items)',
  );
  requireStatus(
    await apiRequest('PATCH', `${ctx.baseUrl}/orders/${createdOrderId}`, ctx.token, {
      paidAmount: 999999,
    }),
    400,
    'orders: patch invalid paidAmount > total',
  );

  requireStatus(
    await apiRequest('PATCH', `${ctx.baseUrl}/orders/${createdOrderId}`, ctx.token, {
      orderStatusId: ctx.ids.orderStatusInProgressId,
      paymentStatusId: ctx.ids.paymentStatusPartiallyPaidId,
      assemblyStatusId: ctx.ids.assemblyStatusId,
      responsibleUserId: ctx.ids.currentUserId,
      storagePlaceId: ctx.ids.storagePlaceId,
      paidAmount: 12,
      items: [
        {
          productId: ctx.ids.productId,
          quantity: 2,
        },
      ],
    }),
    200,
    'orders: unified patch for statuses/payment/responsible/storage/items',
  );

  requireStatus(
    await apiRequest('GET', `${ctx.baseUrl}/orders/${createdOrderId}/history`, ctx.token),
    200,
    'orders: history after unified saves',
  );
}

async function bootstrapCoreRefs(ctx: TestContext) {
  const me = await apiRequest<{ id?: number; userId?: number }>('GET', `${ctx.baseUrl}/auth/me`, ctx.token);
  mustStatus(me, 200, 'auth: me');
  const meId = (me.data as { id?: number; userId?: number } | null)?.id ?? me.data?.userId;
  if (!meId) throw new Error('auth/me returned no id');
  ctx.ids.currentUserId = meId;

  await runDictionaryCrudSuite(ctx, {
    name: 'client-statuses',
    path: 'client-statuses',
    createPayload: (s) => ({ name: `Client status ${s}`, color: colors[0] }),
    updatePayload: (s) => ({ name: `Client status upd ${s}`, color: colors[1] }),
    storeIdAs: 'clientStatusId',
  });
  await runDictionaryCrudSuite(ctx, {
    name: 'manufacturers',
    path: 'manufacturers',
    createPayload: (s) => ({ name: `Manufacturer ${s}`, isActive: true }),
    updatePayload: (s) => ({ name: `Manufacturer upd ${s}`, isActive: false }),
    storeIdAs: 'manufacturerId',
  });
  await runDictionaryCrudSuite(ctx, {
    name: 'active-substances',
    path: 'active-substances',
    createPayload: (s) => ({ name: `Substance ${s}` }),
    updatePayload: (s) => ({ name: `Substance upd ${s}` }),
    storeIdAs: 'activeSubstanceId',
  });
  await runDictionaryCrudSuite(ctx, {
    name: 'product-statuses',
    path: 'product-statuses',
    createPayload: (s) => ({ name: `Product status ${s}`, color: colors[2] }),
    updatePayload: (s) => ({ name: `Product status upd ${s}`, color: colors[3] }),
    storeIdAs: 'productStatusId',
  });
  await runDictionaryCrudSuite(ctx, {
    name: 'product-order-sources',
    path: 'product-order-sources',
    createPayload: (s) => ({ name: `Order source ${s}`, color: colors[4] }),
    updatePayload: (s) => ({ name: `Order source upd ${s}`, color: colors[5] }),
    storeIdAs: 'productOrderSourceId',
  });
  await runDictionaryCrudSuite(ctx, {
    name: 'delivery-companies',
    path: 'delivery-companies',
    createPayload: (s) => ({ name: `Delivery company ${s}`, isActive: true }),
    updatePayload: (s) => ({ name: `Delivery company upd ${s}`, isActive: false }),
    storeIdAs: 'deliveryCompanyId',
  });
  await runDictionaryCrudSuite(ctx, {
    name: 'delivery-types',
    path: 'delivery-types',
    createPayload: (s, c) => ({
      name: `Delivery type ${s}`,
      deliveryCompanyId: c.ids.deliveryCompanyId,
      isActive: true,
    }),
    updatePayload: (s) => ({ name: `Delivery type upd ${s}`, isActive: false }),
    invalidPayload: (s) => ({
      name: `Delivery type invalid ${s}`,
      deliveryCompanyId: 999999999,
      isActive: true,
    }),
    invalidStatus: 404,
  });
  await runDictionaryCrudSuite(ctx, {
    name: 'assembly-statuses',
    path: 'assembly-statuses',
    createPayload: (s) => ({ name: `Assembly status ${s}`, color: colors[0] }),
    updatePayload: (s) => ({ name: `Assembly status upd ${s}`, color: colors[1] }),
    storeIdAs: 'assemblyStatusId',
  });
  await runDictionaryCrudSuite(ctx, {
    name: 'storage-places',
    path: 'storage-places',
    createPayload: (s) => ({ name: `Storage place ${s}`, description: `Storage ${s}`, isActive: true }),
    updatePayload: (s) => ({ name: `Storage place upd ${s}`, description: `Storage upd ${s}`, isActive: false }),
    storeIdAs: 'storagePlaceId',
  });
  await runDictionaryCrudSuite(ctx, {
    name: 'payment-statuses',
    path: 'payment-statuses',
    createPayload: (s) => ({ name: `Payment status ${s}`, color: colors[3] }),
    updatePayload: (s) => ({ name: `Payment status upd ${s}`, color: colors[4] }),
  });
  await runDictionaryCrudSuite(ctx, {
    name: 'order-statuses',
    path: 'order-statuses',
    createPayload: (s) => ({ name: `Order status ${s}`, color: colors[5] }),
    updatePayload: (s) => ({ name: `Order status upd ${s}`, color: colors[0] }),
  });

  ctx.ids.paymentStatusUnpaidId = await getSystemStatusIdByCode(ctx, 'payment-statuses', 'UNPAID');
  ctx.ids.paymentStatusPartiallyPaidId = await getSystemStatusIdByCode(
    ctx,
    'payment-statuses',
    'PARTIALLY_PAID',
  );
  ctx.ids.orderStatusNewId = await getSystemStatusIdByCode(ctx, 'order-statuses', 'NEW');
  ctx.ids.orderStatusInProgressId = await getSystemStatusIdByCode(ctx, 'order-statuses', 'IN_PROGRESS');
  ctx.ids.orderStatusClosedId = await getSystemStatusIdByCode(ctx, 'order-statuses', 'CLOSED');
  ctx.ids.orderStatusCancelledId = await getSystemStatusIdByCode(ctx, 'order-statuses', 'CANCELLED');
}

async function main() {
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Login user: ${LOGIN_EMAIL}`);

  const token = await loginAndGetToken(BASE_URL);
  logOk('Auth login success');

  const ctx: TestContext = {
    baseUrl: BASE_URL,
    token,
    ids: {},
    orderIds: [],
  };

  await bootstrapCoreRefs(ctx);
  await runCitiesSuite(ctx);
  await runClientsSuite(ctx);
  await runProductsSuite(ctx);
  await runOrdersSuite(ctx);

  console.log('\nAll smoke checks finished.');
  if (failures.length > 0) {
    console.log('\nFailed checks:');
    for (const failure of failures) {
      console.log(` - ${failure}`);
    }
    throw new Error(`Smoke failed with ${failures.length} check(s)`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Fatal: ${message}`);
  process.exit(1);
});
