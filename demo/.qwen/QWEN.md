# WMS-for-everyone (demo) — Проект документации для Qwen Code

## 📋 Общая информация о проекте

**Тип приложения:** WMS (Warehouse Management System) — система управления складом  
**Фреймворк:** Spring Boot 3.5.7  
**Язык:** Java 21  
**Сборка:** Maven  
**База данных:** PostgreSQL 16  
**Миграции БД:** Flyway  

---

## 🏗️ Архитектура проекта

### Структура пакетов
```
com.example.demo
├── config/          # Конфигурация безопасности, CORS, OpenAPI
├── controller/      # REST контроллеры
├── dto/             # Data Transfer Objects
├── entity/          # JPA сущности
├── enums/           # Перечисления
├── exception/       # Исключения
├── repository/      # Spring Data JPA репозитории
├── security/        # JWT, UserDetails
├── service/         # Бизнес-логика
└── audit/           # Аудит операций
```

### Основные сущности
| Сущность | Описание |
|----------|----------|
| `Warehouse` | Склады |
| `Location` | Места хранения |
| `Product` | Товары |
| `Category` | Категории товаров |
| `Supplier` | Поставщики |
| `Batch` | Партии товаров |
| `Stock` | Остатки товаров |
| `Receipt` | Документы поступления |
| `Issue` | Документы отгрузки |
| `Transfer` | Документы перемещения |
| `User` | Пользователи системы |
| `Role` | Роли пользователей |
| `AuditLog` | Журнал аудита |
| `QrLabel` | QR-коды маркировки |

### Контроллеры (API endpoints)
| Контроллер | Назначение |
|------------|------------|
| `AuthController` | Аутентификация, JWT токены |
| `AdminUserController` | Управление пользователями |
| `WarehouseController` | CRUD складов |
| `LocationController` | CRUD мест хранения |
| `ProductController` | CRUD товаров |
| `CategoryController` | CRUD категорий |
| `SupplierController` | CRUD поставщиков |
| `ReceiptCrudController` | Документы поступления |
| `ReceiptCommitController` | Проведение поступлений |
| `IssueCrudController` | Документы отгрузки |
| `TransferController` | Документы перемещения |
| `StockController` | Остатки товаров |
| `StockBatchController` | Управление партиями |
| `QrController` | Генерация QR-кодов |
| `FileUploadController` | Загрузка файлов |
| `AuditController` | Журнал аудита |
| `ScanController` | Сканирование штрихкодов |

---

## 🛠️ Технологический стек

### Основные зависимости
| Технология | Версия | Назначение |
|------------|--------|------------|
| Spring Boot | 3.5.7 | Основной фреймворк |
| Spring Security | — | Безопасность |
| Spring Data JPA | — | Работа с БД |
| Hibernate | — | ORM |
| PostgreSQL Driver | — | Драйвер БД |
| Flyway | 11.7.2 | Миграции БД |
| MapStruct | 1.5.5.Final | Маппинг DTO |
| Lombok | 1.18.34 | Генерация кода |
| ZXing | 3.5.3 | QR-коды |
| JJWT | 0.11.5 | JWT токены |
| SpringDoc OpenAPI | 2.6.0 | Swagger UI |
| TestContainers | — | Интеграционные тесты |

---

## 📜 Команды сборки и запуска

### Maven команды
```bash
# Очистка и сборка проекта
mvnw clean install

# Сборка без тестов
mvnw clean package -DskipTests

# Запуск приложения
mvnw spring-boot:run

# Запуск с профилем
mvnw spring-boot:run -Dspring-boot.run.profiles=dev

# Запуск тестов
mvnw test

# Запуск конкретного теста
mvnw test -Dtest=ReceiptServiceIntegrationTest

# Проверка кода на ошибки
mvnw checkstyle:check

# Генерация Javadoc
mvnw javadoc:javadoc
```

### Spring Boot команды
```bash
# Запуск собранного JAR
java -jar target/demo-0.0.1-SNAPSHOT.jar

# Запуск с параметрами
java -jar target/demo-0.0.1-SNAPSHOT.jar --server.port=8081
```

### Flyway команды
```bash
# Применение миграций
mvnw flyway:migrate

# Очистка БД
mvnw flyway:clean

# Информация о миграциях
mvnw flyway:info

# Валидация миграций
mvnw flyway:validate
```

---

## 🐳 Docker

### Запуск базы данных
```bash
# Запуск PostgreSQL
docker-compose up -d

# Просмотр логов
docker-compose logs -f db

# Остановка
docker-compose down

# Остановка с удалением volumes
docker-compose down -v
```

### Параметры подключения к БД
| Параметр | Значение |
|----------|----------|
| Host | localhost |
| Port | 5432 |
| Database | warehouse |
| Username | 1111 |
| Password | 1111 |

---

## 🔐 Безопасность

### JWT конфигурация
```properties
app.jwt.secret=super-secret-key-change-me-please-1234567890
app.jwt.access-ttl=3600000      # 1 час (access token)
app.jwt.refresh-ttl=1209600000  # 14 дней (refresh token)
```

### Endpoints без аутентификации
- `POST /api/auth/login` — вход
- `POST /api/auth/refresh` — обновление токена
- `GET /api/ping` — проверка доступности
- `GET /swagger-ui/**` — Swagger UI
- `GET /v3/api-docs/**` — OpenAPI spec

---

## 📡 API Documentation

### Swagger UI
После запуска приложения документация доступна по адресу:
```
http://localhost:8080/swagger-ui.html
```

### OpenAPI spec
```
http://localhost:8080/v3/api-docs
```

---

## 📁 Структура ресурсов

```
src/main/resources/
├── application.properties    # Основная конфигурация
├── db/
│   └── migration/           # SQL скрипты миграций Flyway
├── static/                  # Статические файлы (CSS, JS, изображения)
└── templates/               # Thymeleaf шаблоны
```

---

## 🧪 Тестирование

### Запуск тестов
```bash
# Все тесты
mvnw test

# Только интеграционные тесты
mvnw test -Dtest=*IntegrationTest

# Только unit тесты
mvnw test -Dtest=*Test -Dtest=!*IntegrationTest
```

### TestContainers
Интеграционные тесты используют TestContainers для поднятия PostgreSQL в Docker:
- Автоматическое создание контейнера перед тестами
- Изолированная БД для каждого теста
- Не требует локальной БД

---

## 📝 Конвенции кода

### Именование
| Тип | Convention | Пример |
|-----|------------|--------|
| Entity | Singular, PascalCase | `Product`, `Warehouse` |
| Repository | Entity + Repository | `ProductRepository` |
| Service | Entity + Service | `ProductService` |
| Controller | Entity + Controller | `ProductController` |
| DTO | Entity + Dto / Dtos | `ProductDto`, `ProductDtos` |
| Enum | Singular, PascalCase | `DocStatus`, `LocationType` |
| Exception | Singular + Exception | `NotFoundException` |

### DTO пакеты
- `dto.catalog` — справочники (товары, категории, поставщики)
- `dto.doc` — документы (поступление, отгрузка, перемещение)
- `dto.stock` — остатки и партии
- `dto.warehouse` — склады и места хранения
- `dto.search` — параметры поиска

### Статусы документов
```java
DocStatus: DRAFT, COMMITTED, CANCELLED
InventoryStatus: PLANNED, IN_PROGRESS, COMPLETED
LocationType: STORAGE, PICKING, RECEIPT, SHIPMENT
IssueReason: SALE, RETURN, DAMAGE, ADJUSTMENT
```

---

## 🔧 Настройки IDE

### Рекомендуемые плагины IntelliJ IDEA
- Lombok
- MapStruct Support
- Spring Boot Assistant
- CheckStyle-IDEA

### Конфигурация Run/Debug
1. **Main Application:** `com.example.demo.DemoApplication`
2. **VM Options:** `-Dspring.profiles.active=dev`
3. **Environment variables:** (при необходимости)

---

## 📊 Логирование

### Уровни логирования
```properties
logging.level.root=INFO
logging.level.org.springframework.web=INFO
logging.level.org.hibernate.SQL=DEBUG
logging.level.org.hibernate.type.descriptor.sql.BasicBinder=TRACE
```

### Логи SQL запросов
Включено подробное логирование:
- SQL запросы с параметрами
- Dirty checking сущностей
- Flush события
- Извлечение коллекций

---

## 🚀 Развёртывание

### Локальный запуск
1. Запустить БД: `docker-compose up -d`
2. Применить миграции: `mvnw flyway:migrate`
3. Запустить приложение: `mvnw spring-boot:run`

### Проверка работы
```bash
# Ping endpoint
curl http://localhost:8080/api/ping

# Swagger UI
open http://localhost:8080/swagger-ui.html
```

---

## ⚠️ Важные замечания

1. **Пароли по умолчанию** — изменить перед продакшеном
2. **JWT secret** — использовать надёжный ключ
3. **Flyway** — миграции применяются автоматически при старте
4. **Upload dir** — файлы загружаются в `./uploads/products`
5. **DevTools** — авто-рестарт при изменении кода

---

## 📞 Контакты

При возникновении вопросов обращайтесь к документации:
- Spring Boot: https://spring.io/projects/spring-boot
- Spring Data JPA: https://spring.io/projects/spring-data-jpa
- Flyway: https://flywaydb.org/documentation
- MapStruct: https://mapstruct.org/documentation
