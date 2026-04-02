# Frontend API Guide (Simplified)

Текущая версия API после упрощения домена заказов.

## Base URL

- Local: `http://localhost:3000/api`

## Auth

- `POST /auth/login`
- `GET /auth/me` (JWT required)

Все API, кроме login, требуют `Authorization: Bearer <token>`.

## Geography (readonly)

### Countries

- `GET /countries`
- `GET /countries/:id`

### Cities

- `GET /cities`
- `GET /cities/:id`

Фильтры `GET /cities`: `search`, `countryId`, `isActive`.

## Dictionaries

Оставшиеся CRUD-справочники:

- `client-statuses`
- `manufacturers`
- `active-substances`
- `product-statuses`
- `product-order-sources`
- `storage-places`

Формат: `GET /resource`, `GET /resource/:id`, `POST`, `PATCH`, `DELETE`.

## Roles (readonly)

- `GET /roles`

Роли фиксированные (в БД, без CRUD):

- `admin`
- `operator_almaty`
- `operator_astana`
- `operator_kz`
- `delivery_operator`
- `assembler`

## Orders

### Endpoints

- `GET /orders`
- `GET /orders/stats/summary`
- `GET /orders/:id`
- `POST /orders`
- `PATCH /orders/:id`
- `DELETE /orders/:id`

`GET /orders/:id/history` удален.

### Static status fields

В заказе статусы больше не через ID-справочники, а через enum-поля:

- `orderStatus`: `ORDER | DELIVERY_REGISTRATION | ADDRESS_REQUIRED | ASSEMBLED_WRITTEN_OFF | PACKED | CLOSED`
- `deliveryStatus`: `COLLECT_DOVAS | COLLECT_PONY | COLLECT_YANDEX`
- `paymentStatus`: `UNPAID | PREPAID_50 | PAID`

### Create order body (example)

```json
{
  "clientId": 1,
  "countryId": 1,
  "cityId": 1,
  "address": "ул. Абая 10",
  "orderStatus": "ORDER",
  "deliveryStatus": "COLLECT_DOVAS",
  "paymentStatus": "UNPAID",
  "deliveryPrice": 0,
  "paidAmount": 0,
  "items": [
    { "productId": 10, "quantity": 2 }
  ]
}
```

### Update order (`PATCH /orders/:id`)

Поддерживается единый save формы. Можно отправлять частичный payload.

Удалены поля:

- `responsibleUserId`
- `deliveryCompanyId`
- `deliveryTypeId`
- `assemblyStatusId`
- `paymentStatusId`
- `orderStatusId`

### Orders filters (`GET /orders`)

- `search`
- `clientId`
- `countryId`
- `cityId`
- `paymentStatus`
- `orderStatus`
- `deliveryStatus`
- `storagePlaceId`
- `dateFrom`
- `dateTo`
- `page`
- `pageSize`
- `sortBy` (`createdAt | updatedAt | totalPrice | remainingAmount`)
- `sortOrder` (`asc | desc`)

### Stats response (`GET /orders/stats/summary`)

```json
{
  "newOrders": 0,
  "inProgress": 0,
  "unpaid": 0,
  "partiallyPaid": 0,
  "totalAmount": "0.00"
}
```
