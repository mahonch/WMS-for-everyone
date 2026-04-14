# 📊 Схема базы данных WMS

## 📋 Описание таблиц

### 🔐 Авторизация и пользователи

| Таблица | Описание |
|---------|----------|
| **roles** | Роли пользователей (ADMIN, MANAGER, STOREKEEPER, GUEST) |
| **users** | Пользователи системы |
| **user_roles** | Связь пользователей с ролями (M:M) |

**users:**
- `id` — ID пользователя
- `username` — Логин (уникальный)
- `email` — Email
- `password_hash` — Хэш пароля
- `active` — Активен/заблокирован
- `warehouse_id` — Привязка к складу
- `created_at` — Дата создания

**roles:**
- `id` — ID роли
- `code` — Код (ADMIN, MANAGER, etc.)
- `name` — Название на русском

---

### 🏭 Склады и места хранения

| Таблица | Описание |
|---------|----------|
| **warehouses** | Склады |
| **locations** | Места хранения (зоны, стеллажи, полки, ячейки) |

**warehouses:**
- `id` — ID склада
- `name` — Название
- `code` — Код (уникальный)
- `address` — Адрес
- `is_active` — Активен ли склад

**locations:**
- `id` — ID места
- `warehouse_id` — Склад (FK → warehouses)
- `code` — Код места
- `name` — Название
- `parent_id` — Родительское место (FK → locations)
- `type` — Тип (ZONE, RACK, SHELF, BIN)

---

### 📦 Товары и справочники

| Таблица | Описание |
|---------|----------|
| **products** | Товары/номенклатура |
| **categories** | Категории товаров (иерархия) |
| **suppliers** | Поставщики |
| **batches** | Партии товаров |

**products:**
- `id` — ID товара
- `sku` — Артикул (уникальный)
- `name` — Название
- `barcode` — Штрихкод
- `category_id` — Категория (FK → categories)
- `unit` — Единица измерения
- `min_stock` — Минимальный остаток
- `cost_price` — Учётная цена
- `image_url` — Изображение
- `is_active` — Активен ли товар

**categories:**
- `id` — ID категории
- `name` — Название
- `parent_id` — Родительская категория (FK → categories)

**suppliers:**
- `id` — ID поставщика
- `name` — Название
- `inn` — ИНН
- `phone` — Телефон
- `email` — Email
- `address` — Адрес

**batches:**
- `id` — ID партии
- `product_id` — Товар (FK → products)
- `number` — Номер партии
- `manufacture_date` — Дата производства
- `expiry_date` — Срок годности
- `location_id` — Текущее место (FK → locations)

---

### 📊 Остатки

| Таблица | Описание |
|---------|----------|
| **stock** | Остатки товаров по местам и партиям |

**stock:**
- `product_id` — Товар (FK → products)
- `location_id` — Место хранения (FK → locations)
- `batch_id` — Партия (FK → batches, nullable)
- `qty` — Количество

*Первичный ключ: (product_id, location_id, batch_id)*

---

### 📄 Документы поступления

| Таблица | Описание |
|---------|----------|
| **receipts** | Документы поступления |
| **receipt_items** | Позиции документов поступления |

**receipts:**
- `id` — ID документа
- `number` — Номер (уникальный)
- `created_at` — Дата создания
- `created_by` — Создал (FK → users)
- `supplier_id` — Поставщик (FK → suppliers)
- `warehouse_id` — Склад приёмки (FK → warehouses)
- `status` — Статус (DRAFT, COMMITTED, CANCELLED)
- `transfer_id` — Связь с перемещением (FK → transfers)

**receipt_items:**
- `id` — ID позиции
- `receipt_id` — Документ (FK → receipts)
- `product_id` — Товар (FK → products)
- `qty` — Количество
- `location_id` — Место размещения (FK → locations)

---

### 📤 Документы отгрузки (списания)

| Таблица | Описание |
|---------|----------|
| **issues** | Документы отгрузки/списания |
| **issue_items** | Позиции документов отгрузки |

**issues:**
- `id` — ID документа
- `number` — Номер (уникальный)
- `created_at` — Дата создания
- `created_by` — Создал (FK → users)
- `status` — Статус (DRAFT, COMMITTED, CANCELLED)
- `reason_code` — Тип операции (DAMAGE, SALE, TRANSFER_OUT)
- `target_warehouse_id` — Целевой склад (FK → warehouses)

**issue_items:**
- `id` — ID позиции
- `issue_id` — Документ (FK → issues)
- `product_id` — Товар (FK → products)
- `from_location_id` — Откуда списать (FK → locations)
- `batch_id` — Партия (FK → batches)
- `qty` — Количество

---

### 🔄 Документы перемещения

| Таблица | Описание |
|---------|----------|
| **transfers** | Документы перемещения |
| **transfer_items** | Позиции документов перемещения |

**transfers:**
- `id` — ID документа
- `number` — Номер (уникальный)
- `created_at` — Дата создания
- `created_by` — Создал (FK → users)
- `from_location_id` — Откуда (FK → locations)
- `to_location_id` — Куда (FK → locations)
- `status` — Статус (DRAFT, COMMITTED, CANCELLED)

**transfer_items:**
- `id` — ID позиции
- `transfer_id` — Документ (FK → transfers)
- `product_id` — Товар (FK → products)
- `batch_id` — Партия (FK → batches)
- `qty` — Количество

---

### 📝 Инвентаризация

| Таблица | Описание |
|---------|----------|
| **inventory_sessions** | Сессии инвентаризации |
| **inventory_items** | Позиции инвентаризации |
| **adjustments** | Корректировки по итогам инвентаризации |
| **adjustment_items** | Позиции корректировок |

**inventory_sessions:**
- `id` — ID сессии
- `started_at` — Дата начала
- `finished_at` — Дата окончания
- `created_by` — Создал (FK → users)
- `status` — Статус (OPEN, CLOSED)

**inventory_items:**
- `id` — ID позиции
- `session_id` — Сессия (FK → inventory_sessions)
- `product_id` — Товар (FK → products)
- `system_qty` — Системное количество
- `actual_qty` — Фактическое количество
- `diff_qty` — Разница (вычисляемое)

**adjustments:**
- `id` — ID корректировки
- `session_id` — Сессия (FK → inventory_sessions)
- `created_at` — Дата создания
- `created_by` — Создал (FK → users)

**adjustment_items:**
- `id` — ID позиции
- `adjustment_id` — Корректировка (FK → adjustments)
- `product_id` — Товар (FK → products)
- `batch_id` — Партия (FK → batches)
- `qty_delta` — Дельта количества

---

### 🔍 Аудит и QR-коды

| Таблица | Описание |
|---------|----------|
| **audit_log** | Журнал аудита операций |
| **qr_labels** | QR-коды маркировки |

**audit_log:**
- `id` — ID записи
- `actor_id` — Кто выполнил (FK → users)
- `action` — Действие (CREATE, UPDATE, DELETE, COMMIT)
- `entity` — Сущность (User, Product, Receipt, etc.)
- `entity_id` — ID сущности
- `before_json` — Данные до (JSONB)
- `after_json` — Данные после (JSONB)
- `ts` — Время операции

**qr_labels:**
- `id` — ID метки
- `entity_type` — Тип сущности (LOCATION, BATCH, PRODUCT)
- `entity_id` — ID сущности
- `payload` — Данные QR-кода
- `created_at` — Дата создания

---

## 🔗 Внешние ключи

```
users.warehouse_id → warehouses.id
user_roles.user_id → users.id
user_roles.role_id → roles.id

locations.warehouse_id → warehouses.id
locations.parent_id → locations.id

products.category_id → categories.id

batches.product_id → products.id
batches.location_id → locations.id

stock.product_id → products.id
stock.location_id → locations.id
stock.batch_id → batches.id

receipts.created_by → users.id
receipts.supplier_id → suppliers.id
receipts.warehouse_id → warehouses.id
receipts.transfer_id → transfers.id

receipt_items.receipt_id → receipts.id
receipt_items.product_id → products.id
receipt_items.location_id → locations.id

issues.created_by → users.id
issues.target_warehouse_id → warehouses.id

issue_items.issue_id → issues.id
issue_items.product_id → products.id
issue_items.from_location_id → locations.id
issue_items.batch_id → batches.id

transfers.created_by → users.id
transfers.from_location_id → locations.id
transfers.to_location_id → locations.id

transfer_items.transfer_id → transfers.id
transfer_items.product_id → products.id
transfer_items.batch_id → batches.id

inventory_sessions.created_by → users.id
inventory_items.session_id → inventory_sessions.id
inventory_items.product_id → products.id

adjustments.session_id → inventory_sessions.id
adjustments.created_by → users.id
adjustment_items.adjustment_id → adjustments.id
adjustment_items.product_id → products.id
adjustment_items.batch_id → batches.id

audit_log.actor_id → users.id

qr_labels.entity_id → (products.id | batches.id | locations.id)
```

---

## 📊 Представления (Materialized Views)

| Представление | Описание |
|---------------|----------|
| **mv_stock_by_product** | Общие остатки по товарам |

---

## 🔣 Перечисления (ENUM)

| Тип | Значения |
|-----|----------|
| **doc_status** | DRAFT, COMMITTED, CANCELLED |
| **location_type** | ZONE, RACK, SHELF, BIN |
| **inventory_status** | OPEN, CLOSED |
