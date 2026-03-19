# Frontend API Guide

Документация для frontend-команды по текущему backend (`NestJS + Prisma`).

## Base URL

- Local: `http://localhost:3000/api`
- Dev (example): `http://127.0.0.1:3002/api`

## Auth

### `POST /auth/login`

Body:

```json
{
  "email": "admin@example.com",
  "password": "admin123"
}
```

Response:

```json
{
  "accessToken": "jwt-token"
}
```

### `GET /auth/me` (JWT required)

Response:

```json
{
  "userId": 1,
  "email": "admin@example.com",
  "role": "admin"
}
```

## Authorization

Все API, кроме `POST /auth/login`, требуют заголовок:

`Authorization: Bearer <accessToken>`

## Common conventions

- Все `:id` в path — integer.
- Поиск: `search` использует case-insensitive contains.
- Ошибки:
  - `400` — бизнес-валидация/некорректные данные.
  - `404` — сущность не найдена.
  - `409` — конфликт (например, дублирование телефона клиента).

---

## Dictionaries (справочники)

Единый CRUD-шаблон (с DELETE):

- `GET /<resource>`
- `GET /<resource>/:id`
- `POST /<resource>`
- `PATCH /<resource>/:id`
- `DELETE /<resource>/:id`

Справочники:

- `client-statuses`
- `manufacturers`
- `active-substances`
- `product-statuses`
- `product-order-sources`
- `delivery-companies`
- `delivery-types`
- `payment-statuses`
- `assembly-statuses`
- `order-statuses`
- `storage-places`
- `countries`

## Cities

- `GET /cities`
- `GET /cities/:id`
- `POST /cities`
- `PATCH /cities/:id`
- `DELETE /cities/:id`

Фильтры:

- `search`
- `countryId`
- `isActive`

## Clients

- `GET /clients`
- `GET /clients/:id`
- `POST /clients`
- `PATCH /clients/:id`
- `DELETE /clients/:id`

Фильтры:

- `search`
- `clientStatusId`

Важное правило:

- `phone` уникален.

## Products

- `GET /products`
- `GET /products/:id`
- `POST /products`
- `PATCH /products/:id`
- `DELETE /products/:id`

Фильтры:

- `search`
- `manufacturerId`
- `activeSubstanceId`
- `productStatusId`
- `productOrderSourceId`
- `isActive`

Response products включает вычисляемое поле:

- `availableQuantity = stockQuantity - reservedQuantity`

---

## Orders (unified save model)

### Endpoints

- `GET /orders`
- `GET /orders/stats/summary`
- `GET /orders/:id`
- `GET /orders/:id/history`
- `POST /orders`
- `PATCH /orders/:id` **(единый save всей формы)**
- `DELETE /orders/:id`

### Важно: точечные actions/items endpoints удалены

Больше не используются:

- `/orders/:id/items/*`
- `/orders/:id/actions/*`

Весь апдейт заказа выполняется через **один** `PATCH /orders/:id`.

### Create order (`POST /orders`)

Минимальный body:

```json
{
  "clientId": 1,
  "countryId": 1,
  "cityId": 1,
  "address": "ул. Абая 10",
  "paymentStatusId": 1,
  "orderStatusId": 1,
  "items": [
    {
      "productId": 10,
      "quantity": 2
    }
  ]
}
```

Поддерживаемые поля:

- `deliveryCompanyId?`
- `deliveryTypeId?`
- `deliveryPrice?`
- `assemblyStatusId?`
- `storagePlaceId?`
- `responsibleUserId?`
- `description?`
- `paidAmount?`

### Unified save (`PATCH /orders/:id`)

Можно отправить:

- только 1 поле (например, `address`),
- только состав товаров (`items`),
- или полностью всю форму.

Body (полный пример):

```json
{
  "address": "ул. Абая 12",
  "deliveryCompanyId": 3,
  "deliveryTypeId": 7,
  "deliveryPrice": 1500,
  "paymentStatusId": 2,
  "orderStatusId": 4,
  "assemblyStatusId": 1,
  "storagePlaceId": 2,
  "responsibleUserId": 5,
  "description": "Комментарий",
  "paidAmount": 1000,
  "items": [
    {
      "productId": 10,
      "quantity": 2
    },
    {
      "productId": 11,
      "quantity": 1
    }
  ]
}
```

`items` в unified save работает как **полная замена состава заказа**.

### Business rules for order update

- Финальные заказы (cancelled/closed) нельзя редактировать.
- Если передан `items`, заказ должен содержать минимум 1 позицию.
- `quantity > 0`.
- Проверяется доступный остаток при резервировании.
- Суммы всегда пересчитываются централизованно.
- Валидируется `paidAmount <= totalPrice`.
- Все изменения в одной транзакции.

---

## Orders list filters (`GET /orders`)

Поддерживаются:

- `search`
- `clientId`
- `countryId`
- `cityId`
- `responsibleUserId`
- `paymentStatusId`
- `orderStatusId`
- `assemblyStatusId`
- `storagePlaceId`
- `deliveryCompanyId`
- `dateFrom`
- `dateTo`
- `page`
- `pageSize`
- `sortBy` (`createdAt | updatedAt | totalPrice | remainingAmount`)
- `sortOrder` (`asc | desc`)

### Pagination behavior

- Если переданы `page`/`pageSize`, response:

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1
}
```

- Если pagination не передана, response — массив заказов.

---

## Orders stats (`GET /orders/stats/summary`)

Query:

- `dateFrom?`
- `dateTo?`
- `statusCode?` (optional)

Response:

```json
{
  "newOrders": 0,
  "inProgress": 0,
  "unpaid": 0,
  "partiallyPaid": 0,
  "totalAmount": "0.00"
}
```

---

## Recommended frontend flow

1. Login -> store `accessToken`.
2. Load dictionaries in parallel.
3. For order form:
   - initial load via `GET /orders/:id` (or blank for create),
   - one save button -> one `PATCH /orders/:id` with full form.
4. After save:
   - refresh by `GET /orders/:id`,
   - optionally load `GET /orders/:id/history`.

---

## Quick checklist for frontend integration

- Use only unified order save endpoint (`PATCH /orders/:id`).
- Do not call removed point endpoints for items/actions.
- Send numeric ids as numbers.
- Keep `items` array complete when updating items.
- Handle `400/404/409` with user-friendly messages.
