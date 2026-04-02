# Qwen Code Workflows для WMS-for-everyone

## 🔄 Рабочие процессы

### 1. Создание новой сущности (Entity)

При запросе создания новой сущности выполняю:

```
1. Создать Entity класс в src/main/java/com/example/demo/entity/
   - Добавить @Entity, @Table
   - Добавить поля с @Id, @Column, @OneToMany и т.д.
   - Использовать Lombok (@Data, @Builder, @NoArgsConstructor, @AllArgsConstructor)

2. Создать Repository в src/main/java/com/example/demo/repository/
   - Интерфейс extends JpaRepository<Entity, Long>
   - Добавить custom query методы при необходимости

3. Создать DTO в src/main/java/com/example/demo/dto/
   - Record классы для request/response
   - Добавить валидацию (@NotNull, @Size и т.д.)

4. Создать Service в src/main/java/com/example/demo/service/
   - @Service аннотация
   - Конструкторная инъекция
   - CRUD методы + бизнес-логика

5. Создать Controller в src/main/java/com/example/demo/controller/
   - @RestController, @RequestMapping
   - CRUD endpoints (GET, POST, PUT, DELETE)
   - Использовать ResponseEntity для ответов

6. Создать Mapper (MapStruct) в src/main/java/com/example/demo/mapper/
   - @Mapper интерфейс
   - Методы toEntity(), toDto()

7. Создать тесты в src/test/java/com/example/demo/
   - Unit тесты для Service
   - Integration тесты для Controller
```

---

### 2. Добавление нового API endpoint

```
1. Определить DTO для request/response
2. Добавить метод в Service
3. Добавить endpoint в Controller
4. Обновить OpenAPI документацию (@Operation, @ApiResponse)
5. Добавить тест
6. Проверить через Swagger UI
```

---

### 3. Изменение существующей функциональности

```
1. Найти все связанные файлы (Entity, Repository, Service, Controller, DTO)
2. Внести изменения
3. Обновить миграцию БД если нужно
4. Запустить тесты
5. Проверить компиляцию
```

---

### 4. Работа с базой данных

#### Создание новой миграции
```
1. Создать файл в src/main/resources/db/migration/
   - Имя: V{version}__{description}.sql
   - Пример: V1.0.5__add_user_table.sql
2. Добавить SQL CREATE/ALTER TABLE
3. Запустить mvnw flyway:migrate
```

#### Откат миграции
```
1. Создать undo скрипт
2. Запустить mvnw flyway:clean
3. Исправить миграцию
4. Запустить mvnw flyway:migrate
```

---

### 5. Добавление валидации

```
1. Добавить зависимости (если нет):
   - spring-boot-starter-validation

2. В DTO добавить аннотации:
   - @NotNull, @NotEmpty, @NotBlank
   - @Size, @Min, @Max
   - @Email, @Pattern
   - @Valid для вложенных объектов

3. В Controller добавить @Valid перед @RequestBody

4. Обработать исключения в GlobalExceptionHandler
```

---

### 6. Работа с JWT токенами

```
1. Получить токен через POST /api/auth/login
2. Использовать в заголовке: Authorization: Bearer {token}
3. Для обновления: POST /api/auth/refresh с refresh token
```

---

### 7. Генерация QR-кодов

```
1. Использовать QrController
2. Endpoint: POST /api/qr/generate
3. Получить изображение в ответе
4. Сохранить в QrLabel entity
```

---

### 8. Загрузка файлов

```
1. Endpoint: POST /api/files/upload
2. Content-Type: multipart/form-data
3. Файлы сохраняются в uploads/products/
4. Максимальный размер: 5MB
```

---

### 9. Аудит операций

```
1. AuditLog entity автоматически записывает:
   - Кто выполнил действие
   - Какое действие
   - Когда выполнено
   - Какие данные изменены

2. Просмотр через GET /api/audit
```

---

### 10. Поиск и фильтрация

```
1. Использовать Search DTO в dto.search/
2. Передать параметры поиска в запросе
3. Service применяет Specification/QueryDSL фильтры
4. Возвращает отфильтрованные результаты
```

---

## 🎯 Быстрые команды

### Для разработки
```bash
# Запуск с авто-рестартом
mvnw spring-boot:run

# Сборка + тесты
mvnw clean test

# Только компиляция
mvnw compile

# Проверка зависимостей
mvnw dependency:tree
```

### Для отладки
```bash
# Запуск с debug портом
mvnw spring-boot:run -Dspring-boot.run.jvmArguments="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005"

# Логирование SQL
# В application.properties установить:
# logging.level.org.hibernate.SQL=DEBUG
```

### Для деплоя
```bash
# Создать production JAR
mvnw clean package -DskipTests

# Запуск JAR
java -jar target/demo-0.0.1-SNAPSHOT.jar
```

---

## 📋 Чек-лист перед коммитом

- [ ] Код компилируется без ошибок
- [ ] Все тесты проходят
- [ ] Нет предупреждений линтера
- [ ] Миграции БД корректны
- [ ] API документация обновлена
- [ ] Логирование настроено
- [ ] Конфиденциальные данные не закоммичены

---

## 🔍 Поиск в проекте

### Найти использование сущности
```
Поиск: "import.*{EntityName}"
Поиск: "private.*{EntityName}"
```

### Найти endpoint
```
Поиск: "@GetMapping.*{path}"
Поиск: "@PostMapping.*{path}"
```

### Найти query метод
```
Поиск: "find.*By.*"
Поиск: "@Query"
```

---

## 🐛 Частые проблемы и решения

### Ошибка компиляции MapStruct
```
Решение: mvnw clean compile
Проверить: mapstruct-processor в pom.xml
```

### Flyway миграция не применяется
```
Решение: mvnw flyway:clean && mvnw flyway:migrate
Проверить: spring.flyway.enabled=true
```

### TestContainers не запускается
```
Решение: Установить Docker Desktop
Проверить: Docker запущен
```

### JWT токен не валиден
```
Решение: Проверить app.jwt.secret в application.properties
Проверить: Время жизни токена не истекло
```

### Файлы не загружаются
```
Решение: Проверить права на uploads/ директорию
Проверить: spring.servlet.multipart.enabled=true
```
