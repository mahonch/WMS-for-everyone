# WMS Project - История изменений и текущее состояние
## Дата: 2026-02-22

---

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
