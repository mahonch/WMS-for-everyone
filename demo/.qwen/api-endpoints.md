# API Endpoints — WMS-for-everyone

## 📡 Общая информация

**Base URL:** `http://localhost:8080/api`  
**Swagger UI:** `http://localhost:8080/swagger-ui.html`  
**OpenAPI Spec:** `http://localhost:8080/v3/api-docs`

---

## 🔐 Аутентификация

### POST /auth/login
Вход в систему, получение JWT токенов.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600000,
  "tokenType": "Bearer"
}
```

---

### POST /auth/refresh
Обновление access токена.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600000,
  "tokenType": "Bearer"
}
```

---

## 👥 Пользователи (Admin)

### GET /admin/users
Получить список всех пользователей.

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "roles": ["ADMIN", "WAREHOUSE_MANAGER"],
    "active": true,
    "createdAt": "2024-01-01T10:00:00"
  }
]
```

---

### POST /admin/users
Создать пользователя.

**Request:**
```json
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "password123",
  "roleIds": [1, 2]
}
```

---

### PUT /admin/users/{id}
Обновить пользователя.

**Request:**
```json
{
  "email": "newemail@example.com",
  "roleIds": [1],
  "active": true
}
```

---

### DELETE /admin/users/{id}
Удалить пользователя.

**Response (204 No Content)**

---

## 🏢 Склады

### GET /warehouses
Получить список складов.

**Query Parameters:**
- `page` (int) — номер страницы
- `size` (int) — размер страницы
- `name` (string) — фильтр по названию
- `city` (string) — фильтр по городу

**Response (200 OK):**
```json
{
  "content": [
    {
      "id": 1,
      "name": "Основной склад",
      "code": "WH001",
      "address": "ул. Складская, 1",
      "city": "Москва",
      "active": true
    }
  ],
  "totalElements": 10,
  "totalPages": 1,
  "currentPage": 0
}
```

---

### GET /warehouses/{id}
Получить склад по ID.

---

### POST /warehouses
Создать склад.

**Request:**
```json
{
  "name": "Новый склад",
  "code": "WH002",
  "address": "ул. Новая, 10",
  "city": "Санкт-Петербург"
}
```

---

### PUT /warehouses/{id}
Обновить склад.

---

### DELETE /warehouses/{id}
Удалить склад.

---

## 📍 Места хранения

### GET /locations
Получить список мест хранения.

**Query Parameters:**
- `warehouseId` (long) — фильтр по складу
- `type` (string) — тип (STORAGE, PICKING, RECEIPT, SHIPMENT)
- `zone` (string) — зона склада

---

### POST /locations
Создать место хранения.

**Request:**
```json
{
  "warehouseId": 1,
  "code": "A-01-01",
  "name": "Стойка A, ряд 1, место 1",
  "type": "STORAGE",
  "zone": "A",
  "maxWeight": 100.5,
  "maxVolume": 1.5
}
```

---

## 📦 Товары

### GET /products
Получить список товаров.

**Query Parameters:**
- `name` (string) — поиск по названию
- `sku` (string) — поиск по артикулу
- `categoryId` (long) — фильтр по категории
- `supplierId` (long) — фильтр по поставщику
- `minPrice` (decimal) — минимальная цена
- `maxPrice` (decimal) — максимальная цена

**Response (200 OK):**
```json
{
  "content": [
    {
      "id": 1,
      "sku": "PROD-001",
      "name": "Товар 1",
      "description": "Описание товара",
      "price": 1999.99,
      "currency": "RUB",
      "categoryId": 1,
      "categoryName": "Электроника",
      "supplierId": 1,
      "supplierName": "Поставщик 1",
      "barcode": "4601234567890",
      "active": true
    }
  ]
}
```

---

### GET /products/{id}
Получить товар по ID.

---

### POST /products
Создать товар.

**Request:**
```json
{
  "sku": "PROD-002",
  "name": "Новый товар",
  "description": "Описание",
  "price": 2999.99,
  "currency": "RUB",
  "categoryId": 1,
  "supplierId": 1,
  "barcode": "4601234567891",
  "weight": 0.5,
  "dimensions": {
    "length": 10,
    "width": 5,
    "height": 3
  }
}
```

---

### PUT /products/{id}
Обновить товар.

---

### DELETE /products/{id}
Удалить товар.

---

### POST /products/{id}/qr
Сгенерировать QR-код для товара.

**Response:** изображение PNG (content-type: image/png)

---

## 📂 Категории

### GET /categories
Получить дерево категорий.

---

### POST /categories
Создать категорию.

**Request:**
```json
{
  "name": "Новая категория",
  "parentId": 1,
  "description": "Описание категории"
}
```

---

### PUT /categories/{id}
Обновить категорию.

---

### DELETE /categories/{id}
Удалить категорию.

---

## 🏭 Поставщики

### GET /suppliers
Получить список поставщиков.

**Query Parameters:**
- `name` (string) — поиск по названию
- `inn` (string) — поиск по ИНН
- `active` (boolean) — только активные

---

### POST /suppliers
Создать поставщика.

**Request:**
```json
{
  "name": "ООО Поставщик",
  "inn": "1234567890",
  "kpp": "123456789",
  "address": "г. Москва, ул. Примерная, 1",
  "phone": "+7 (495) 123-45-67",
  "email": "info@supplier.ru",
  "contactPerson": "Иванов Иван",
  "website": "https://supplier.ru"
}
```

---

## 📄 Документы поступления

### GET /receipts
Получить список документов поступления.

**Query Parameters:**
- `status` (string) — статус (DRAFT, COMMITTED, CANCELLED)
- `supplierId` (long) — фильтр по поставщику
- `warehouseId` (long) — фильтр по складу
- `dateFrom` (date) — дата с
- `dateTo` (date) — дата по
- `number` (string) — поиск по номеру

**Response (200 OK):**
```json
{
  "content": [
    {
      "id": 1,
      "number": "RCV-2024-0001",
      "status": "COMMITTED",
      "supplierId": 1,
      "supplierName": "Поставщик 1",
      "warehouseId": 1,
      "warehouseName": "Основной склад",
      "createdAt": "2024-01-15T10:00:00",
      "committedAt": "2024-01-15T12:00:00",
      "createdBy": "admin",
      "totalItems": 5,
      "totalQuantity": 100
    }
  ]
}
```

---

### GET /receipts/{id}
Получить документ поступления с позициями.

**Response (200 OK):**
```json
{
  "id": 1,
  "number": "RCV-2024-0001",
  "status": "DRAFT",
  "supplierId": 1,
  "warehouseId": 1,
  "createdAt": "2024-01-15T10:00:00",
  "items": [
    {
      "productId": 1,
      "productName": "Товар 1",
      "quantity": 50,
      "price": 100.00,
      "total": 5000.00,
      "locationId": 1
    }
  ]
}
```

---

### POST /receipts
Создать документ поступления.

**Request:**
```json
{
  "supplierId": 1,
  "warehouseId": 1,
  "items": [
    {
      "productId": 1,
      "quantity": 50,
      "locationId": 1
    }
  ]
}
```

---

### PUT /receipts/{id}
Обновить документ поступления.

---

### POST /receipts/{id}/commit
Провести документ поступления.

**Response (200 OK):**
```json
{
  "id": 1,
  "number": "RCV-2024-0001",
  "status": "COMMITTED",
  "committedAt": "2024-01-15T12:00:00"
}
```

---

### POST /receipts/{id}/cancel
Отменить документ поступления.

---

### DELETE /receipts/{id}
Удалить документ поступления (только статус DRAFT).

---

## 📤 Документы отгрузки

### GET /issues
Получить список документов отгрузки.

**Query Parameters:**
- `status` (string) — статус
- `reason` (string) — причина (SALE, RETURN, DAMAGE, ADJUSTMENT)
- `warehouseId` (long) — фильтр по складу
- `dateFrom` / `dateTo` — период

---

### POST /issues
Создать документ отгрузки.

**Request:**
```json
{
  "reason": "SALE",
  "warehouseId": 1,
  "counterparty": "ООО Клиент",
  "items": [
    {
      "productId": 1,
      "quantity": 10,
      "locationId": 1
    }
  ]
}
```

---

### POST /issues/{id}/commit
Провести документ отгрузки.

---

### POST /issues/{id}/cancel
Отменить документ отгрузки.

---

## 🔄 Документы перемещения

### GET /transfers
Получить список документов перемещения.

---

### POST /transfers
Создать документ перемещения.

**Request:**
```json
{
  "fromWarehouseId": 1,
  "toWarehouseId": 2,
  "items": [
    {
      "productId": 1,
      "quantity": 20,
      "fromLocationId": 1,
      "toLocationId": 5
    }
  ]
}
```

---

### POST /transfers/{id}/commit
Провести документ перемещения.

---

## 📊 Остатки

### GET /stock
Получить остатки товаров.

**Query Parameters:**
- `warehouseId` (long) — фильтр по складу
- `productId` (long) — фильтр по товару
- `locationId` (long) — фильтр по месту хранения
- `minQuantity` (int) — минимальное количество

**Response (200 OK):**
```json
[
  {
    "productId": 1,
    "productName": "Товар 1",
    "warehouseId": 1,
    "warehouseName": "Основной склад",
    "locationId": 1,
    "locationCode": "A-01-01",
    "quantity": 100,
    "reserved": 10,
    "available": 90,
    "batches": [
      {
        "batchNumber": "BATCH-001",
        "quantity": 50,
        "productionDate": "2024-01-01",
        "expiryDate": "2025-01-01"
      }
    ]
  }
]
```

---

### GET /stock/batches
Получить информацию о партиях.

---

## 🔍 Поиск

### POST /search/products
Расширенный поиск товаров.

**Request:**
```json
{
  "name": "товар",
  "sku": "PROD%",
  "categoryIds": [1, 2, 3],
  "priceRange": {
    "min": 100,
    "max": 10000
  },
  "inStock": true,
  "sortBy": "name",
  "sortOrder": "ASC"
}
```

---

### POST /search/receipts
Расширенный поиск поступлений.

---

### POST /search/issues
Расширенный поиск отгрузок.

---

## 📝 Аудит

### GET /audit
Получить журнал аудита.

**Query Parameters:**
- `entityType` (string) — тип сущности
- `entityId` (long) — ID сущности
- `action` (string) — действие (CREATE, UPDATE, DELETE)
- `userId` (long) — пользователь
- `dateFrom` / `dateTo` — период

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "entityType": "Product",
    "entityId": 1,
    "action": "UPDATE",
    "userId": 1,
    "username": "admin",
    "timestamp": "2024-01-15T14:30:00",
    "changes": {
      "price": {
        "old": 1999.99,
        "new": 2499.99
      },
      "name": {
        "old": "Старое название",
        "new": "Новое название"
      }
    }
  }
]
```

---

## 📷 Сканирование

### POST /scan
Обработать отсканированный штрихкод/QR-код.

**Request:**
```json
{
  "code": "4601234567890",
  "codeType": "BARCODE"
}
```

**Response (200 OK):**
```json
{
  "found": true,
  "type": "Product",
  "data": {
    "id": 1,
    "sku": "PROD-001",
    "name": "Товар 1"
  }
}
```

---

## 📁 Загрузка файлов

### POST /files/upload
Загрузить файл.

**Request:** multipart/form-data с полем `file`

**Response (200 OK):**
```json
{
  "fileName": "product-image.jpg",
  "filePath": "/uploads/products/product-image.jpg",
  "fileSize": 102400,
  "contentType": "image/jpeg",
  "uploadedAt": "2024-01-15T10:00:00"
}
```

---

### GET /files/{fileName}
Получить загруженный файл.

---

## 🏓 Ping

### GET /ping
Проверить доступность сервиса.

**Response (200 OK):**
```json
{
  "status": "UP",
  "timestamp": "2024-01-15T10:00:00",
  "version": "0.0.1-SNAPSHOT"
}
```

---

## 📋 Коды ошибок HTTP

| Код | Описание |
|-----|----------|
| 200 | Успешно |
| 201 | Создано |
| 204 | Успешно удалено |
| 400 | Некорректный запрос |
| 401 | Не авторизован |
| 403 | Нет доступа |
| 404 | Не найдено |
| 409 | Конфликт (уже существует) |
| 422 | Ошибка валидации |
| 500 | Внутренняя ошибка |

---

## 🔑 Заголовки

### Обязательные для авторизованных запросов
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### Для загрузки файлов
```
Authorization: Bearer ...
Content-Type: multipart/form-data
```
