type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

type ApiResult<T = unknown> = {
  status: number;
  data: T | null;
  rawText: string;
};

type Ctx = {
  baseUrl: string;
  token: string;
  ids: {
    countryId: number;
    manufacturerId: number;
    activeSubstanceId: number;
    sourceId: number;
    storagePlaceId: number;
    productId: number;
    orderId: number;
  };
  created: Array<{ path: string; id: number }>;
};

const BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000/api';
const LOGIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? 'admin@example.com';
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
  const ok = result.status === expected;
  if (ok) {
    logOk(`${title} -> ${expected}`);
    return true;
  }
  logError(`${title} -> expected ${expected}, got ${result.status}. Body: ${result.rawText}`);
  failures.push(`${title}: expected ${expected}, got ${result.status}`);
  return false;
}

function expectStatusIn(result: ApiResult, expected: number[], title: string): boolean {
  const ok = expected.includes(result.status);
  if (ok) {
    logOk(`${title} -> ${result.status}`);
    return true;
  }
  logError(`${title} -> expected one of [${expected.join(', ')}], got ${result.status}. Body: ${result.rawText}`);
  failures.push(`${title}: expected one of [${expected.join(', ')}], got ${result.status}`);
  return false;
}

function mustStatus(result: ApiResult, expected: number, title: string) {
  if (!expectStatus(result, expected, title)) {
    throw new Error(`${title}: expected ${expected}, got ${result.status}`);
  }
}

async function loginAndGetToken(baseUrl: string): Promise<string> {
  const response = await apiRequest<{ accessToken?: string }>('POST', `${baseUrl}/auth/login`, undefined, {
    email: LOGIN_EMAIL,
    password: LOGIN_PASSWORD,
  });
  mustStatus(response, 201, 'auth/login');
  const token = response.data?.accessToken;
  if (!token) throw new Error('auth/login did not return accessToken');
  return token;
}

async function createEntity(
  ctx: Ctx,
  path: string,
  payload: Record<string, unknown>,
  title: string,
  remember = true,
) {
  const res = await apiRequest<{ id?: number }>('POST', `${ctx.baseUrl}/${path}`, ctx.token, payload);
  mustStatus(res, 201, title);
  const id = res.data?.id;
  if (!id) throw new Error(`${title}: no id in response`);
  if (remember) {
    ctx.created.push({ path, id });
  }
  return id;
}

async function prepareCoreReferences(ctx: Ctx) {
  const countries = await apiRequest<Array<{ id: number; code?: string; name: string }>>('GET', `${ctx.baseUrl}/countries`, ctx.token);
  mustStatus(countries, 200, 'countries: list');
  const kz = countries.data?.find((c) => c.code === 'KZ' || c.name === 'Казахстан');
  if (!kz) throw new Error('countries: KZ not found');
  ctx.ids.countryId = kz.id;

  const suffix = randomSuffix();
  ctx.ids.manufacturerId = await createEntity(
    ctx,
    'manufacturers',
    { name: `Smoke Manufacturer ${suffix}`, countryId: ctx.ids.countryId, isActive: true },
    'manufacturers: create',
  );
  ctx.ids.activeSubstanceId = await createEntity(
    ctx,
    'active-substances',
    { name: `Smoke Substance ${suffix}`, isActive: true },
    'active-substances: create',
  );
  ctx.ids.sourceId = await createEntity(
    ctx,
    'product-order-sources',
    { name: `Smoke Source ${suffix}`, color: '#2563eb', isActive: true },
    'product-order-sources: create',
  );
  ctx.ids.storagePlaceId = await createEntity(
    ctx,
    'storage-places',
    { name: `Smoke Storage ${suffix}`, description: 'Smoke storage', isActive: true },
    'storage-places: create',
  );
}

async function runReadOnlyCountriesChecks(ctx: Ctx) {
  console.log('\n--- read-only countries ---');
  const countries = await apiRequest<Array<{ id: number }>>('GET', `${ctx.baseUrl}/countries`, ctx.token);
  mustStatus(countries, 200, 'countries: list');
  const countryId = countries.data?.[0]?.id;
  if (!countryId) throw new Error('countries: empty list');
  mustStatus(await apiRequest('GET', `${ctx.baseUrl}/countries/${countryId}`, ctx.token), 200, 'countries: get by id');
  expectStatusIn(
    await apiRequest('POST', `${ctx.baseUrl}/countries`, ctx.token, { name: 'Blocked Country' }),
    [404, 405],
    'countries: create blocked',
  );
  expectStatusIn(
    await apiRequest('PATCH', `${ctx.baseUrl}/countries/${countryId}`, ctx.token, { name: 'Blocked' }),
    [404, 405],
    'countries: update blocked',
  );
  expectStatusIn(await apiRequest('DELETE', `${ctx.baseUrl}/countries/${countryId}`, ctx.token), [404, 405], 'countries: delete blocked');

}

async function runRolesChecks(ctx: Ctx) {
  console.log('\n--- roles ---');
  const roles = await apiRequest<Array<{ code: string; isSystem?: boolean }>>('GET', `${ctx.baseUrl}/roles`, ctx.token);
  mustStatus(roles, 200, 'roles: list');
  const expected = ['admin', 'manager', 'delivery_operator', 'assembler'];
  for (const code of expected) {
    const found = roles.data?.find((r) => r.code === code);
    if (!found) {
      failures.push(`roles: missing ${code}`);
      logError(`roles: missing ${code}`);
    } else {
      logOk(`roles: contains ${code}`);
    }
  }
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
    'products: ON_REQUEST requires source',
  );

  ctx.ids.productId = await createEntity(
    ctx,
    'products',
    {
      name: `Smoke Product ${suffix}`,
      description: 'smoke product',
      manufacturerId: ctx.ids.manufacturerId,
      activeSubstanceId: ctx.ids.activeSubstanceId,
      availabilityStatus: 'ON_REQUEST',
      productOrderSourceId: ctx.ids.sourceId,
      stockQuantity: 40,
      reservedQuantity: 2,
      price: 2150.5,
      isActive: true,
    },
    'products: create',
  );

  mustStatus(await apiRequest('GET', `${ctx.baseUrl}/products/${ctx.ids.productId}`, ctx.token), 200, 'products: get by id');
  mustStatus(await apiRequest('GET', `${ctx.baseUrl}/products?availabilityStatus=ON_REQUEST`, ctx.token), 200, 'products: list by status');

  mustStatus(
    await apiRequest('PATCH', `${ctx.baseUrl}/products/${ctx.ids.productId}`, ctx.token, { stockQuantity: 1, reservedQuantity: 5 }),
    400,
    'products: reserved cannot exceed stock',
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
  mustStatus(sourceReset, 200, 'products: IN_STOCK resets source');
  if (sourceReset.data?.productOrderSourceId !== null) {
    throw new Error('products: IN_STOCK expected productOrderSourceId to be null');
  }
  logOk('products: source reset to null for IN_STOCK');
}

async function runOrdersChecks(ctx: Ctx) {
  console.log('\n--- orders ---');
  const suffix = randomSuffix();
  const orderCreate = await apiRequest<{ id?: number }>('POST', `${ctx.baseUrl}/orders`, ctx.token, {
    clientPhone: `+7708${String(Date.now()).slice(-7)}`,
    countryId: ctx.ids.countryId,
    city: `Алматы-${suffix}`,
    address: `Smoke address ${suffix}`,
    deliveryStatus: 'COLLECT_DOVAS',
    deliveryPrice: 1500,
    paymentStatus: 'UNPAID',
    orderStatus: 'ORDER',
    storagePlaceId: ctx.ids.storagePlaceId,
    description: `SMOKE_ORDER_${suffix}`,
    paidAmount: 0,
    items: [{ productId: ctx.ids.productId, quantity: 2 }],
  });
  mustStatus(orderCreate, 201, 'orders: create');
  ctx.ids.orderId = orderCreate.data?.id ?? 0;
  if (!ctx.ids.orderId) throw new Error('orders: create returned no id');
  ctx.created.push({ path: 'orders', id: ctx.ids.orderId });

  mustStatus(await apiRequest('GET', `${ctx.baseUrl}/orders/${ctx.ids.orderId}`, ctx.token), 200, 'orders: get by id');
  mustStatus(await apiRequest('GET', `${ctx.baseUrl}/orders/stats/summary`, ctx.token), 200, 'orders: stats summary');
  mustStatus(
    await apiRequest(
      'GET',
      `${ctx.baseUrl}/orders?page=1&pageSize=10&orderStatuses=ORDER,DELIVERY_REGISTRATION&city=Алматы`,
      ctx.token,
    ),
    200,
    'orders: list with orderStatuses csv',
  );
  mustStatus(
    await apiRequest('GET', `${ctx.baseUrl}/orders?orderStatuses[]=ORDER&orderStatuses[]=DELIVERY_REGISTRATION`, ctx.token),
    400,
    'orders: reject orderStatuses[] params',
  );

  mustStatus(
    await apiRequest('PATCH', `${ctx.baseUrl}/orders/${ctx.ids.orderId}`, ctx.token, {
      orderStatus: 'ASSEMBLY_REQUIRED',
      deliveryStatus: 'COLLECT_PONY',
      items: [{ productId: ctx.ids.productId, quantity: 1 }],
      paidAmount: 500,
    }),
    200,
    'orders: patch to ASSEMBLY_REQUIRED',
  );

  mustStatus(
    await apiRequest('PATCH', `${ctx.baseUrl}/orders/${ctx.ids.orderId}`, ctx.token, { items: [] }),
    400,
    'orders: patch with empty items rejected',
  );

  mustStatus(
    await apiRequest('PATCH', `${ctx.baseUrl}/orders/${ctx.ids.orderId}`, ctx.token, { paidAmount: 999999999 }),
    400,
    'orders: paidAmount cannot exceed total',
  );

  mustStatus(
    await apiRequest('PATCH', `${ctx.baseUrl}/orders/${ctx.ids.orderId}`, ctx.token, { orderStatus: 'CLOSED' }),
    200,
    'orders: close',
  );

  mustStatus(
    await apiRequest('PATCH', `${ctx.baseUrl}/orders/${ctx.ids.orderId}`, ctx.token, { address: `after-close-${suffix}` }),
    400,
    'orders: closed order cannot be edited',
  );
}

async function cleanup(ctx: Ctx) {
  for (const entity of [...ctx.created].reverse()) {
    const res = await apiRequest('DELETE', `${ctx.baseUrl}/${entity.path}/${entity.id}`, ctx.token);
    if (res.status === 200 || res.status === 404) {
      logOk(`cleanup: ${entity.path}/${entity.id} -> ${res.status}`);
    } else {
      logError(`cleanup: ${entity.path}/${entity.id} failed -> ${res.status} (${res.rawText})`);
    }
  }
}

async function main() {
  console.log(`Base URL: ${BASE_URL}`);
  const token = await loginAndGetToken(BASE_URL);
  logOk('auth: login success');

  const ctx: Ctx = {
    baseUrl: BASE_URL,
    token,
    ids: {
      countryId: 0,
      manufacturerId: 0,
      activeSubstanceId: 0,
      sourceId: 0,
      storagePlaceId: 0,
      productId: 0,
      orderId: 0,
    },
    created: [],
  };

  try {
    mustStatus(await apiRequest('GET', `${ctx.baseUrl}/auth/me`, ctx.token), 200, 'auth: me');
    await runRolesChecks(ctx);
    await runReadOnlyCountriesChecks(ctx);
    await prepareCoreReferences(ctx);
    await runProductsChecks(ctx);
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
