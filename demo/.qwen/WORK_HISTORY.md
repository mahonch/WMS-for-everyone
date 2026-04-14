# WMS Project - История изменений и текущее состояние
## Дата: 2026-04-11

---

## 📋 ТЕКУЩАЯ ЗАДАЧА: Обновление приёмки и создание страниц товара/ячейки

### Требования:

#### 1. Список приёмки (`/pages/receipts.html`)
- Отображение первых 10 приёмок с пагинацией
- Кнопка "Создать приёмку" → создаёт черновик сразу в списке
- При клике на приёмку → переход на страницу детальной приёмки

#### 2. Детальная страница приёмки
- **Статус ЧЕРНОВИК (DRAFT):**
  - Можно редактировать (добавлять/удалять позиции, менять количество, цену, локацию)
  - Кнопка "Подписать" (commit) — после подписания товар попадает на склад
  - Кнопка "Удалить"
  - Кнопка "Распечатать"
- **Статус ПОДПИСАН (COMMITTED):**
  - Только кнопка "Распечатать"
  - Нет редактирования
- **Breadcrumbs навигация:**
  - Журнал приёмки → Приёмка №N → Товар → Ячейка
  - Все элементы кликабельны

#### 3. Страница карточки товара (`/pages/product-detail.html`)
- Вся информация о товаре (из Product entity + DTO)
  - ID, SKU, Название, Barcode, Категория, Ед. измерения
  - Мин. остаток, Цена, Статус активности, Изображение
- Связанные документы (приёмки, списания, перемещения)
- Переход на страницу ячейки (где хранится товар)
- Переход на страницу приёмки/списания

#### 4. Страница ячейки (`/pages/location-detail.html`)
- Вся информация о ячейке (из Location entity + DTO)
  - ID, Код, Название, Склад, Тип, Родительская ячейка
  - Статистика: всего товаров, количество, стоимость
- Товары в ячейке (связанные через Stock/ReceiptItem)
- Переход на страницу товара
- Переход на связанные документы

#### 5. Навигация между страницами
- Из товара → в ячейку и обратно
- Из ячейки → в товар и обратно
- Из приёмки → в товар/ячейку
- Из товара/ячейки → в связанные документы
- Breadcrumbs на всех страницах

---

## 📦 СУЩНОСТИ (Backend)

### Product Entity
```java
Long id
String sku (unique)
String name
String barcode (unique)
Category category (ManyToOne)
String unit = "pcs"
Integer minStock = 0
BigDecimal costPrice = 0
String imageUrl
Boolean isActive = true
```

### ProductDto.View
```java
Long id
String sku
String name
String barcode
Long categoryId
String categoryName
String unit
Integer minStock
BigDecimal costPrice
Boolean isActive
String imageUrl
```

### Location Entity
```java
Long id
Warehouse warehouse (ManyToOne)
String code
String name
Location parent (ManyToOne, self)
LocationType type = BIN
```

### LocationDto.View
```java
Long id
String code
String name
Long warehouseId
String warehouseName
Long parentId
String parentName
LocationType type
Long totalProducts
Long totalQty
BigDecimal totalValue
```

### Receipt Entity
```java
Long id
String number (unique)
LocalDateTime createdAt
User createdBy
User committedBy
LocalDateTime committedAt
Supplier supplier
Warehouse warehouse
BigDecimal totalSum
DocStatus status = DRAFT
String docType = "RECEIPT"
List<ReceiptItem> items
```

### ReceiptItem Entity
```java
Long id
Receipt receipt
Product product
Batch batch
Location location
Integer qty
BigDecimal price
Instant createdAt
```

### DocStatus Enum
```java
DRAFT, COMMITTED, CANCELLED
```

### LocationType Enum
```java
STORAGE, PICKING, RECEIPT, SHIPMENT, BIN
```

---

## 📡 API ENDPOINTS (релевантные)

### Products
- `GET /api/products?page=0&size=20` — список с пагинацией
- `GET /api/products/{id}` — товар по ID
- `GET /api/products/search?name=&sku=&barcode=&categoryId=&isActive=&page=0&size=20` — поиск

### Locations
- `GET /api/locations` — все локации списком
- `GET /api/locations/{id}` — локация по ID
- `GET /api/locations/search?code=&name=&warehouseId=&parentId=&type=&page=0&size=20` — поиск
- `GET /api/locations/warehouse/{warehouseId}` — локации по складу

### Receipts
- `GET /api/receipts?page=0&size=20` — список с пагинацией (фильтруется по складу пользователя)
- `GET /api/receipts/{id}` — приёмка по ID (с позициями)
- `POST /api/receipts` — создать черновик
- `PUT /api/receipts/{id}` — обновить черновик
- `POST /api/receipts/{id}/commit` — провести приёмку
- `DELETE /api/receipts/{id}` — удалить черновик
- `POST /api/receipts/{id}/items` — добавить позицию
- `PUT /api/receipts/{id}/items/{itemId}` — обновить позицию
- `DELETE /api/receipts/{id}/items/{itemId}` — удалить позицию

---

## 📁 СТРУКТУРА ПРОЕКТА (frontend static)

```
src/main/resources/static/
├── pages/
│   ├── receipts.html              # Список приёмочных документов (старый, на замену)
│   ├── receipts-vue.html          # Список приёмочных документов (Vue, на замену)
│   ├── receipt-detail-vue.html    # Детальная страница приёмки (Vue, на замену)
│   ├── product-detail.html        # Карточка товара (НОВЫЙ)
│   ├── location-detail.html       # Карточка ячейки (НОВЫЙ)
│   └── ...
├── js/
│   ├── receipt-detail.js          # Логика детальной приёмки (Vue)
│   ├── receipts-store.js          # Pinia store
│   ├── receipt-service.js         # API service
│   ├── product-detail.js          # Логика карточки товара (НОВЫЙ)
│   ├── location-detail.js         # Логика карточки ячейки (НОВЫЙ)
│   └── ...
└── css/
    └── app-v2.css                 # Основные стили
```

---

## 🔧 ТЕКУЩИЕ ПРОБЛЕМЫ

### 1. Кэширование JS файлов браузером
**Решение:** Добавлять `?v=2` к URL скриптов

### 2. Правильный порядок загрузки скриптов
Для CDN версий Vue/Pinia использовать глобальные переменные, НЕ `export`!

---

## 📝 ЗАПОМНИТЬ

### Pinia Store с CDN:
```javascript
// ❌ НЕ работает с CDN
export const useStore = defineStore(...)

// ✅ Работает с CDN
const useStore = Pinia.defineStore(...)
```

### Vue Component с CDN:
```javascript
const { createApp, ref, computed, onMounted } = Vue;
const { createVuetify } = Vuetify;
const { createPinia, defineStore } = Pinia;
```

### AuthService использование:
```javascript
const token = await AuthService.getToken();
fetch('/api/...', {
    headers: { 'Authorization': 'Bearer ' + token }
})
```

---

**ПОСЛЕДНЕЕ ИЗМЕНЕНИЕ:** 2026-04-11
**СОСТОЯНИЕ:** ✅ Завершено — приёмка, товары, ячейки полностью обновлены

## 📋 ВЫПОЛНЕННЫЕ ИЗМЕНЕНИЯ (2026-04-11)

### 1. Список приёмки (receipts-vue.html)
**Изменения:**
- Пагинация по 10 документов (вместо 20)
- Кнопка "Создать приёмку" → открывает диалог выбора поставщика
- При создании → создаётся черновик с номером и временем
- Клик на документ → переход на `/pages/receipt-detail-vue.html?id=N`

**Файлы:**
- `/pages/receipts-vue.html` — обновлён
- `/js/vue-receipts-list.js` — добавлена логика создания
- `/js/stores/receipts-store.js` — добавлен метод `createReceipt()`
- `/js/services/receipt-service.js` — добавлен метод `createReceipt()`

---

### 2. Детальная страница приёмки (receipt-detail-vue.html)
**Статус ЧЕРНОВИК (DRAFT):**
- Можно редактировать позиции (добавлять/удалять товары)
- Можно менять локацию для каждой позиции
- Кнопки: "Подписать", "Удалить", "Распечатать", "Назад"
- Клик на товар → переход на `/pages/product-detail.html?id=N`
- Клик на локацию → переход на `/pages/location-detail.html?id=N`

**Статус ПОДПИСАН (COMMITTED):**
- Только кнопка "Распечатать" + "Назад"
- Нет редактирования
- Кликабельные ссылки на товар и локацию

**Breadcrumbs:**
- Главная → Журнал приёмки → Приёмка №N

**Файлы:**
- `/pages/receipt-detail-vue.html` — обновлён
- `/js/vue-receipt-detail.js` — добавлена навигация и выбор локации

---

### 3. Страница карточки товара (product-detail.html) — НОВЫЙ
**Функционал:**
- Вся информация о товаре: SKU, Название, Barcode, Категория, Ед. измерения, Мин. остаток, Цена, Изображение
- Остатки на складах (ссылки на ячейки)
- Связанные документы (табы):
  - Приёмки → клик → переход на receipt-detail
  - Списания → список
  - Перемещения → список
- Кнопка "Распечатать"
- Кнопка "Назад" к списку товаров

**Breadcrumbs:**
- Главная → Товары → Название товара

**Навигация:**
- Из товара → в ячейку (клик на локацию)
- Из товара → в категорию
- Из товара → в связанные документы

**Файлы:**
- `/pages/product-detail.html` — создан
- `/js/product-detail.js` — создан

---

### 4. Страница карточки ячейки (location-detail.html) — НОВЫЙ
**Функционал:**
- Вся информация о ячейке: Код, Название, Склад, Тип, Родительская ячейка
- Статистика: всего товаров, количество, стоимость
- Товары в ячейке (таблица с кликабельными ссылками)
- Связанные документы (табы):
  - Приёмки → клик → переход на receipt-detail
  - Списания → список
  - Перемещения → список
- Кнопка "Распечатать"
- Кнопка "Назад" к складу

**Breadcrumbs:**
- Главная → Склады → Название склада → Код ячейки

**Навигация:**
- Из ячейки → в товар (клик на товар)
- Из ячейки → в склад
- Из ячейки → в родительскую ячейку
- Из ячейки → в связанные документы

**Файлы:**
- `/pages/location-detail.html` — создан
- `/js/location-detail.js` — создан

---

### 5. SecurityConfig
**Добавлены страницы в permitAll:**
- `/pages/product-detail.html`
- `/pages/location-detail.html`

---

## 📁 ОБНОВЛЁННАЯ СТРУКТУРА

```
src/main/resources/static/
├── pages/
│   ├── receipts-vue.html              # Список приёмки (пагинация 10, создание)
│   ├── receipt-detail-vue.html        # Детальная приёмка (DRAFT/COMMITTED)
│   ├── product-detail.html            # Карточка товара (НОВЫЙ)
│   ├── location-detail.html           # Карточка ячейки (НОВЫЙ)
│   └── ...
├── js/
│   ├── vue-receipts-list.js           # Логика списка приёмки
│   ├── vue-receipt-detail.js          # Логика детальной приёмки
│   ├── product-detail.js              # Логика карточки товара (НОВЫЙ)
│   ├── location-detail.js             # Логика карточки ячейки (НОВЫЙ)
│   ├── stores/receipts-store.js       # Pinia store (createReceipt добавлен)
│   └── services/receipt-service.js    # API service (createReceipt добавлен)
└── ...
```

---

## 🔗 НАВИГАЦИЯ МЕЖДУ СТРАНИЦАМИ

```
Журнал приёмки (receipts-vue.html)
    └── Приёмка №N (receipt-detail-vue.html)
            ├── Товар (product-detail.html)
            │       ├── Ячейка (location-detail.html)
            │       ├── Приёмка (receipt-detail-vue.html)
            │       └── Категория
            └── Ячейка (location-detail.html)
                    ├── Товар (product-detail.html)
                    ├── Склад (warehouse-detail.html)
                    ├── Родительская ячейка
                    └── Приёмка (receipt-detail-vue.html)
```

---

## 🧪 ТЕСТИРОВАНИЕ

### Flow проверки:
1. Открыть http://localhost:8080/pages/receipts-vue.html
2. Нажать "Создать приёмку" → выбрать поставщика → создать
3. Клик на созданную приёмку → открывается детальная
4. Для DRAFT: добавить позиции, выбрать локации, нажать "Подписать"
5. Для COMMITTED: только "Распечатать"
6. Клик на товар → переход на product-detail.html
7. Клик на локацию → переход на location-detail.html
8. На странице товара/ячейки → связанные документы

---

## 🐛 ТЕКУЩАЯ ПРОБЛЕМА (2026-04-11)

### Страница `/pages/receipt-detail.html` — пустой контент

**Симптомы:**
- Breadcrumbs обновляются — номер документа (R-2026041...) виден в хлебных крошках
- Sidebar отображается корректно
- Контент (`#receiptContent`) полностью пустой — нет карточек, таблицы, кнопок
- API работает — данные загружаются (иначе breadcrumbs не обновился бы)

**Что сделано:**
1. `renderAll()` вызывается — бредкрамб обновляется, значит функция доходит как минимум до шага 1
2. Убраны все `try-catch` из `renderAll()` — теперь любая ошибка будет видна в консоли
3. Каждый шаг логируется: `1 bc=`, `2 ht=`, `3 ab=` и т.д.
4. Версия скрипта обновлена на `v=4`

**Вероятные причины:**
- `renderItems()` падает и прерывает выполнение (нет try-catch)
- `esc()` функция может падать на null/undefined
- CSS классы `.info-box`, `.status-pill` и т.д. не работают (нет стилей в app-v2.css)
- `receipt.items` может быть undefined

**Следующий шаг:**
- Открыть консоль браузера (F12) на `/pages/receipt-detail.html?id=21`
- Посмотреть логи: на каком шаге `renderAll()` останавливается
- Посмотреть ошибки в консоли

**Файлы:**
- `/pages/receipt-detail.html` — HTML страница
- `/js/receipt-detail.js?v=4` — JS логика (без try-catch для отладки)
- `/pages/receipts.html` — список приёмки (работает)
- `/js/receipts.js` — логика списка (работает)

---

**ПОСЛЕДНЕЕ ИЗМЕНЕНИЕ:** 2026-04-11
**СОСТОЯНИЕ:** ⏸️ Ожидание — нужно открыть консоль браузера и посмотреть ошибки

---

## 📋 НОВЫЙ РАЗДЕЛ: КЛАДОВЩИКИ И СБОРЩИКИ (ПЛАНИРОВАНИЕ)

### Контекст
Мобильное веб-приложение (mobile-first) для кладовщиков и сборщиков заказов.
Все страницы статические (HTML/CSS/JS), адаптированы под телефон.

### Сущности (новые)

#### 1. Worker (расширение User)
- Статус смены: ON_SHIFT / OFF_SHIFT
- Роль: STOREKEEPER / PICKER
- Время начала/конца смены
- Статистика: выполнено задач за смену

#### 2. Task
- Тип: RECEIPT (приёмка), PICKING (сборка), TRANSFER (перемещение), INVENTORY (инвентаризация)
- Статус: PENDING → ASSIGNED → IN_PROGRESS → COMPLETED / CANCELLED
- Привязка к Receipt / Issue / Transfer
- Назначенный работник
- Время создания, назначения, начала, завершения
- Список TaskItem (товары к обработке)

#### 3. TaskItem
- Ссылка на Task
- Product, Location
- План кол-во / Факт кол-во
- Подтверждено (true/false)
- Порядок в маршруте (sortOrder)

#### 4. Route
- Связан с Task типа PICKING
- Список точек (ячеек) в оптимальном порядке
- Сортировка: по зоне → по коду ячейки (возрастание)

### Поток работы

#### ПРИЁМКА (кладовщик)
```
1. Менеджер создаёт Receipt → подписывает (COMMITTED)
2. АВТОМАТИЧЕСКИ создаётся Task type=RECEIPT, status=PENDING
3. Кладовщик заходит на смену (ON_SHIFT)
4. Видит список доступных задач PENDING
5. Берёт задачу → status=ASSIGNED → IN_PROGRESS
6. Сканирует QR товара → подтверждает приём
7. Сканирует QR ячейки → размещает товар
8. Все позиции подтверждены → Task COMPLETED
```

#### СБОРКА ЗАКАЗА (сборщик)
```
1. Заказ приходит через API (внешняя система) → создаётся Issue
2. АВТОМАТИЧЕСКИ создаётся Task type=PICKING, status=PENDING
3. Система строит Route по ячейкам товаров (зона→код)
4. Сборщик на смене (ON_SHIFT) → видит задачу
5. Берёт задачу → видит маршрут (список ячеек по порядку)
6. Идёт по маршруту: сканирует ячейку → сканирует товар → подтверждает
7. Все товары собраны → Task COMPLETED → Issue COMMITTED
```

### API Endpoints (новые)

```
# Смены
GET    /api/workers/me              — мой профиль, статус смены
POST   /api/workers/me/shift/start  — начать смену
POST   /api/workers/me/shift/end    — закончить смену

# Задачи
GET    /api/tasks?status=&type=&page=0&size=20   — список задач
GET    /api/tasks/{id}              — детальная задача
GET    /api/tasks/{id}/route        — маршрут для задачи
POST   /api/tasks/{id}/take         — взять задачу (назначить себя)
POST   /api/tasks/{id}/start        — начать выполнение
POST   /api/tasks/{id}/complete     — завершить

# Сканирование
POST   /api/scan/task-item          — сканировать товар в задаче
POST   /api/scan/location           — сканировать ячейку

# Заказы (внешнее API — заглушка)
POST   /api/orders/sync             — получить заказы из внешней системы
GET    /api/orders                  — список заказов
```

### Фронтенд (mobile-first страницы)

```
/pages/worker/
├── login.html          — вход работника
├── dashboard.html      — главная: статус смены, статистика
├── shift.html          — управление сменой (начать/завершить)
├── tasks.html          — список доступных/моих задач
├── task-detail.html    — детальная задача + сканирование
├── route.html          — маршрут сборки (пошагово)
└── profile.html        — профиль работника
```

### Миграции БД

```
V30__create_worker_shifts.sql         — таблица смен
V31__create_tasks.sql                 — задачи
V32__create_task_items.sql            — позиции задач
V33__create_routes.sql                — маршруты
V34__create_route_points.sql          — точки маршрута
V35__add_task_fk_to_receipts.sql      — связь Receipt→Task
V36__add_task_fk_to_issues.sql        — связь Issue→Task
V37__create_orders_api_log.sql        — лог внешних заказов
```

---

## ❓ ВОПРОСЫ К УТОЧНЕНИЮ

### 1. Авторизация работников
- Отдельный вход для работников или тот же логин через `/index.html`?
- Работник видит только свои задачи или все доступные?

### 2. Сканирование QR
- Через камеру телефона (QR-сканер в браузере) или внешний сканер (как клавиатура)?
- QR-код ячейки и товара — один формат или разный?

### 3. Заказы из внешней системы
- Какой формат API внешней системы? (REST, webhook, polling?)
- Как маппить внешний заказ на Issue? (какие поля: товары, кол-во, адрес?)
- Нужен UI для ручного создания заказа (пока нет внешней системы)?

### 4. Маршрут
- Сортировка только по коду ячейки (A-01-01 < A-01-02 < B-01-01)?
- Или есть координаты/расстояния между ячейками?

### 5. Подтверждение приёмки
- Кладовщик подтверждает каждую позицию отдельно или всю задачу одним кликом?
- Что если фактическое кол-во ≠ плановое?

### 6. Сборка заказа
- Сборщик видит маршрут как список шагов (ячейка 1 → товар → ячейка 2 → товар)?
- Или карту склада?

### 7. Роли
- Один человек может быть и кладовщик и сборщик?
- Или разные пользователи?

---

**ПОСЛЕДНЕЕ ИЗМЕНЕНИЕ:** 2026-04-11
**СОСТОЯНИЕ:** ⏸️ Ожидание ответов на вопросы → затем начало реализации

## 📋 С ЧЕМ РАБОТАЛИ (ПОСЛЕДНИЕ ИЗМЕНЕНИЯ)

### 1. Vue 3 + Vuetify + Pinia Dashboard

**Созданные файлы:**
- `/src/main/resources/static/dashboard-vue.html` — Vue дашборд страница
- `/src/main/resources/static/js/vue-dashboard.js` — логика дашборда
- `/src/main/resources/static/css/loaders.css` — стили для лоадеров

**Изменения:**
- Добавлен `/dashboard-vue.html` в SecurityConfig.java
- Интеграция с CDN: Vue 3.4.21, Vuetify 3.7.1, Pinia 2.1.7

**Статус:** ✅ Работает
**URL:** http://localhost:8080/dashboard-vue.html

---

### 2. Приёмка на Vue 3 (ПЕРЕПИСАНА)

**Созданные файлы:**

#### Stores:
- `/src/main/resources/static/js/stores/receipts-store.js`
  - Pinia store: `useReceiptsStore`
  - State: receipts, currentReceipt, loading, error, pagination, filters
  - Actions: fetchReceipts, fetchReceiptById, commitReceipt, deleteReceipt
  - ⚠️ ВАЖНО: Использовать глобальные переменные (НЕ export!)

#### Services:
- `/src/main/resources/static/js/services/receipt-service.js`
  - `ReceiptService` объект (НЕ export!)
  - Методы: getReceipts, getReceiptById, commitReceipt, deleteReceipt

#### Страницы:
- `/src/main/resources/static/pages/receipts-vue.html`
  - Список документов приёмки
  - Поиск, пагинация, действия
  - Breadcrumbs навигация

- `/src/main/resources/static/pages/receipt-detail-vue.html`
  - Детальная страница документа
  - Информация о документе + позиции
  - Кнопки: Провести/Удалить/Назад

#### JavaScript приложения:
- `/src/main/resources/static/js/vue-receipts-list.js` — список приёмочных документов
- `/src/main/resources/static/js/vue-receipt-detail.js` — детальная страница

**SecurityConfig.java изменения:**
```java
.requestMatchers("/pages/receipts-vue.html", "/pages/receipt-detail-vue.html").permitAll()
```

**Статус:** ⚠️ ТРЕБУЕТ ПРОВЕРКИ (проблема с кэшем)
**URL:** 
- Список: http://localhost:8080/pages/receipts-vue.html?v=2
- Детальная: http://localhost:8080/pages/receipt-detail-vue.html?id=1

---

### 3. Автоматическое обновление токена (Auth Service)

**Созданные файлы:**
- `/src/main/resources/static/js/auth-service.js`
  - Авто-обновление access токена через refresh
  - Перехват 401 ошибок
  - Отслеживание активности (logout через 30 мин)
  - Метод: `AuthService.getToken()` — получить токен (обновит если нужно)

**Backend:**
- `/src/main/java/com/example/demo/controller/AuthController.java`
  - Добавлен endpoint: `POST /api/auth/refresh`
  - `RefreshReq` DTO
  - Метод `refresh()` для обновления токена

- `/src/main/java/com/example/demo/security/JwtService.java`
  - Добавлен метод: `validateRefreshToken(String token)`

**Изменения в страницах:**
- Все страницы подключают `<script src="/js/auth-service.js"></script>`
- `receipts.js`, `issues.js` — используют `AuthService.getToken()`

**Статус:** ✅ Работает

---

### 4. Фильтрация по складу пользователя

**Где реализовано:**

#### Товары (`/pages/products.html`):
- Фильтрация остатков по `userWarehouseId`
- Показывает только склад пользователя в правой панели
- `ProductsPage.loadUserProfile()` — загрузка профиля
- `ProductsPage.loadAllStocks()` — фильтрация stocks

#### Приёмка (`/pages/receipts-vue.html`):
- Фильтрация через `ReceiptsStore.fetchReceipts()`
- Показывает приёмки склада пользователя

#### Списание (`/pages/issues.html`):
- `IssueCrudController.list()` — фильтрация по складу
- `issues.js` — загрузка профиля

#### Перемещения (`/pages/transfers.html`):
- `TransferController.list()` — фильтрация по from/to location
- Показывает если склад совпадает с from ИЛИ to

**Backend изменения:**
- `User.java` — добавлено поле `warehouseId`
- `V25__add_warehouse_to_users.sql` — миграция БД
- `ProfileController.java` — API `/api/profile`
- `AdminUserController.java` — endpoint `/api/admin/users/{id}/warehouse`

**Статус:** ✅ Работает

---

### 5. Удаление эмодзи

**Обработано файлов:** 22
- Все `.html` и `.js` файлы в `/static/`
- Эмодзи заменены на текст или удалены

**Скрипт:** `remove_emojis.py` (удалён после использования)

**Статус:** ✅ Завершено

---

### 6. Product Drag-and-Drop (Перемещение товаров)

**Файл:** `/src/main/resources/static/js/product-drag.js`

**Функционал:**
- Long press на товаре → начало перетаскивания
- Drop на склад/ячейку → открытие модальных окон
- `ProductDragSourceSelect` — выбор откуда списать
- `ProductDragTargetSelect` — выбор куда переместить
- `ProductTransferModal` — подтверждение перемещения

**Создаёт документ:** Transfer (перемещение)

**Статус:** ✅ Работает

---

### 7. Страница профиля пользователя

**Файл:** `/src/main/resources/static/pages/profile.html`

**Функционал:**
- Просмотр информации о пользователе
- Редактирование email
- Выбор рабочего склада
- Toast уведомления (справа снизу)

**API:**
- `GET /api/profile` — получить профиль
- `PUT /api/profile` — обновить профиль
- `GET /api/profile/warehouses` — список складов

**Статус:** ✅ Работает

---

## 🔧 ТЕКУЩИЕ ПРОБЛЕМЫ

### 1. Кэширование JS файлов браузером

**Проблема:**
```
Uncaught SyntaxError: Unexpected token 'export'
ReferenceError: useReceiptsStore is not defined
```

**Причина:** Браузер кэширует старую версию файлов с `export`

**Решение:**
1. Очистить кэш браузера (Ctrl+Shift+Delete)
2. Или открыть в режиме инкогнито
3. Или добавить `?v=2` к URL скриптов

**Файлы с version query:**
```html
<script src="/js/stores/receipts-store.js?v=2"></script>
<script src="/js/services/receipt-service.js?v=2"></script>
<script src="/js/vue-receipts-list.js?v=2"></script>
```

---

### 2. Правильный порядок загрузки скриптов

**ВАЖНО:** Для CDN версий Vue/Pinia использовать глобальные переменные!

**НЕЛЬЗЯ:**
```javascript
export const useReceiptsStore = ...  // ❌
```

**МОЖНО:**
```javascript
const useReceiptsStore = Pinia.defineStore(...)  // ✅
```

**Порядок в HTML:**
```html
1. Vue 3
2. VueDemi
3. Pinia
4. Vuetify
5. Stores (receipts-store.js)
6. Services (receipt-service.js)
7. App (vue-receipts-list.js)
```

---

## 📁 СТРУКТУРА ПРОЕКТА (Vue части)

```
src/main/resources/static/
├── pages/
│   ├── receipts-vue.html          # Список приёмочных документов
│   ├── receipt-detail-vue.html    # Детальная страница приёмки
│   └── profile.html               # Профиль пользователя
├── js/
│   ├── stores/
│   │   └── receipts-store.js      # Pinia store для приёмки
│   ├── services/
│   │   └── receipt-service.js     # API сервис для приёмки
│   ├── vue-dashboard.js           # Дашборд Vue app
│   ├── vue-receipts-list.js       # Список приёмочных документов
│   ├── vue-receipt-detail.js      # Детальная страница приёмки
│   └── auth-service.js            # AuthService (токены)
└── css/
    └── loaders.css                # Стили лоадеров
```

---

## 🚀 СЛЕДУЮЩИЕ ШАГИ

### 1. Проверить работу приёмки на Vue
```
1. Очистить кэш браузера
2. Войти: admin / admin123
3. Открыть: http://localhost:8080/pages/receipts-vue.html?v=2
4. Кликнуть на документ → проверить детальную страницу
```

### 2. Добавить создание приёмки (Modal Dialog)
- Диалог выбора поставщика
- Диалог выбора склада
- Добавление позиций
- Сохранение черновика

### 3. Перевести остальные страницы на Vue
- Списание (issues)
- Перемещения (transfers)
- Товары (products)

### 4. Оптимизация
- Собрать через Vite/Webpack (вместо CDN)
- Tree shaking для уменьшения размера
- Lazy loading для роутов

---

## 📝 ЗАПОМНИТЬ

### Pinia Store с CDN:
```javascript
// ❌ НЕ работает с CDN
export const useStore = defineStore(...)

// ✅ Работает с CDN
const useStore = Pinia.defineStore(...)
```

### Vue Component с CDN:
```javascript
const { createApp, ref, computed, onMounted } = Vue;
const { createVuetify } = Vuetify;
const { createPinia, defineStore } = Pinia;
```

### AuthService использование:
```javascript
// Получить токен (обновит если нужно)
const token = await AuthService.getToken();

// Использовать в fetch
fetch('/api/...', {
    headers: { 'Authorization': 'Bearer ' + token }
})
```

### Breadcrumbs навигация:
```javascript
const breadcrumbs = [
    { title: 'Главная', disabled: false, href: '/dashboard-vue.html' },
    { title: 'Приёмка', disabled: false, href: '/pages/receipts-vue.html' },
    { title: '№документа', disabled: true },
];
```

---

## 🔐 SECURITY CONFIG

**Разрешённые страницы (permitAll):**
```java
"/pages/receipts-vue.html"
"/pages/receipt-detail-vue.html"
"/dashboard-vue.html"
"/pages/profile.html"
// ... остальные
```

**API для приёмки:**
```java
"/api/receipts/**" — ADMIN, STOREKEEPER
```

---

## 📊 API ENDPOINTS (Приёмка)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/receipts?page=0&size=20` | Список документов |
| GET | `/api/receipts/{id}` | Детальная информация |
| POST | `/api/receipts` | Создать документ |
| POST | `/api/receipts/{id}/commit` | Провести документ |
| DELETE | `/api/receipts/{id}` | Удалить документ (DRAFT) |

---

## 🎨 VUETIFY КОМПОНЕНТЫ (использованные)

- `v-app` — корневой компонент
- `v-navigation-drawer` — sidebar
- `v-app-bar` — верхняя панель
- `v-main` — основной контент
- `v-container` — контейнер
- `v-breadcrumbs` — навигация
- `v-data-table` — таблица с данными
- `v-card` — карточки
- `v-chip` — статусы
- `v-btn` — кнопки
- `v-text-field` — поля ввода
- `v-pagination` — пагинация
- `v-overlay` — лоадер
- `v-alert` — уведомления

---

## 📞 КОНТАКТЫ / РЕСУРСЫ

- Vue 3 Docs: https://vuejs.org/
- Pinia Docs: https://pinia.vuejs.org/
- Vuetify 3 Docs: https://vuetifyjs.com/
- CDN ссылки:
  - Vue: https://cdn.jsdelivr.net/npm/vue@3.4.21/dist/vue.global.prod.js
  - Pinia: https://cdn.jsdelivr.net/npm/pinia@2.1.7/dist/pinia.iife.prod.js
  - Vuetify: https://cdn.jsdelivr.net/npm/vuetify@3.7.1/dist/vuetify.min.js

---

**ПОСЛЕДНЕЕ ИЗМЕНЕНИЕ:** 2026-02-22 20:00
**СОСТОЯНИЕ:** Требуется очистка кэша браузера для проверки приёмки на Vue
