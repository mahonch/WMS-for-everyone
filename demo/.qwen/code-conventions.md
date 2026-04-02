# Соглашения о коде для WMS-for-everyone

## 📝 Общие принципы

### Язык кода
- **Код:** английский (идентификаторы, комментарии в коде)
- **Комментарии:** русский (только для сложной логики)
- **Документация:** русский (JavaDoc для публичных API)

### Стиль кода
- Следовать [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html)
- Использовать CheckStyle для проверки

---

## 🏷️ Именование

### Классы и интерфейсы
```java
// Сущности (Singular, PascalCase)
public class Product { }
public class Warehouse { }

// Интерфейсы (PascalCase)
public interface ProductService { }
public interface UserDetailsService { }

// Исключения (Singular + Exception)
public class NotFoundException { }
public class InvalidDataException { }

// Перечисления (PascalCase)
public enum DocStatus { DRAFT, COMMITTED, CANCELLED }
public enum LocationType { STORAGE, PICKING }
```

### Переменные и поля
```java
// camelCase, описательные имена
private Long productId;
private String warehouseName;
private List<Product> products;

// Константы (UPPER_SNAKE_CASE)
private static final int MAX_RETRY_COUNT = 3;
private static final String DEFAULT_CURRENCY = "RUB";

// Коллекции (множественное число)
private List<Order> orders;
private Map<Long, User> userMap;
private Set<String> permissions;
```

### Методы
```java
// CRUD операции
public Product findById(Long id);
public List<Product> findAll();
public Product save(Product product);
public void deleteById(Long id);

// Булевы методы (is/has/can/should)
public boolean isActive();
public boolean hasPermission(String permission);
public boolean canEdit();

// Методы получения (get/find/search)
public Product getById(Long id);
public Optional<Product> findBySku(String sku);
public List<Product> searchByName(String name);

// Методы действия (create/update/delete/commit/cancel)
public void createOrder(Order order);
public void updateProduct(Product product);
public void commitDocument(String documentNumber);
public void cancelDocument(String documentNumber);
```

### Пакеты
```
com.example.demo
├── config/           # Конфигурационные классы
├── controller/       # REST контроллеры
├── dto/              # DTO классы
│   ├── catalog/     # Справочники
│   ├── doc/         # Документы
│   ├── search/      # Параметры поиска
│   ├── stock/       # Остатки
│   └── warehouse/   # Склады
├── entity/           # JPA сущности
│   └── enums/       # Перечисления
├── exception/        # Исключения
├── mapper/           # MapStruct мапперы
├── repository/       # Spring Data репозитории
├── security/         # Безопасность
├── service/          # Сервисный слой
│   └── impl/        # Реализации сервисов
└── util/             # Утилиты
```

---

## 📦 Аннотации

### Lombok
```java
// Для Entity
@Entity
@Table(name = "products")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Product { }

// Для DTO (использовать Record для Java 16+)
public record ProductDto(
    @NotNull Long id,
    @NotBlank String name,
    @NotNull BigDecimal price
) { }

// Только для чтения
@Entity
@Table(name = "audit_log")
@Getter
@Builder
@NoArgsConstructor
public class AuditLog { }

// Для мапперов
@Mapper(componentModel = "spring", injectionStrategy = InjectionStrategy.CONSTRUCTOR)
public interface ProductMapper { }
```

### Spring
```java
// Конструкторная инъекция (предпочтительно)
@Service
@RequiredArgsConstructor
public class ProductService {
    private final ProductRepository repository;
    private final ProductMapper mapper;
}

// REST контроллеры
@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {
    private final ProductService service;
    
    @GetMapping
    public ResponseEntity<List<ProductDto>> findAll() { }
    
    @GetMapping("/{id}")
    public ResponseEntity<ProductDto> findById(@PathVariable Long id) { }
    
    @PostMapping
    public ResponseEntity<ProductDto> create(@Valid @RequestBody ProductCreateDto dto) { }
    
    @PutMapping("/{id}")
    public ResponseEntity<ProductDto> update(
        @PathVariable Long id,
        @Valid @RequestBody ProductUpdateDto dto
    ) { }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) { }
}

// Репозитории
@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findBySku(String sku);
    List<Product> findByNameContainingIgnoreCase(String name);
    
    @Query("SELECT p FROM Product p WHERE p.price BETWEEN :min AND :max")
    List<Product> findByPriceRange(@Param("min") BigDecimal min, @Param("max") BigDecimal max);
}
```

### JPA
```java
// Сущности
@Entity
@Table(name = "products")
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true, length = 50)
    private String sku;
    
    @Column(nullable = false, length = 200)
    private String name;
    
    @Column(precision = 19, scale = 4)
    private BigDecimal price;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;
    
    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Stock> stocks = new ArrayList<>();
}

// Связи
@OneToOne
@JoinColumn(name = "address_id")
private Address address;

@ManyToOne
@JoinColumn(name = "user_id")
private User user;

@OneToMany(mappedBy = "order", cascade = CascadeType.ALL)
private List<OrderItem> items;

@ManyToMany
@JoinTable(
    name = "user_roles",
    joinColumns = @JoinColumn(name = "user_id"),
    inverseJoinColumns = @JoinColumn(name = "role_id")
)
private Set<Role> roles;
```

### Валидация
```java
public record ProductCreateDto(
    @NotBlank(message = "Артикул обязателен")
    @Size(min = 3, max = 50, message = "Артикул должен быть от 3 до 50 символов")
    String sku,
    
    @NotBlank(message = "Название обязательно")
    @Size(min = 3, max = 200, message = "Название должно быть от 3 до 200 символов")
    String name,
    
    @NotNull(message = "Цена обязательна")
    @DecimalMin(value = "0.01", message = "Цена должна быть больше 0")
    BigDecimal price,
    
    @NotNull(message = "Категория обязательна")
    Long categoryId,
    
    @Email(message = "Некорректный email")
    String supplierEmail
) { }
```

### OpenAPI (Swagger)
```java
@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@Tag(name = "Товары", description = "API для управления товарами")
public class ProductController {
    
    @GetMapping
    @Operation(summary = "Получить все товары", description = "Возвращает список всех товаров")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Успешно"),
        @ApiResponse(responseCode = "401", description = "Не авторизован"),
        @ApiResponse(responseCode = "403", description = "Нет доступа")
    })
    public ResponseEntity<List<ProductDto>> findAll() { }
    
    @GetMapping("/{id}")
    @Operation(summary = "Получить товар по ID")
    public ResponseEntity<ProductDto> findById(
        @Parameter(description = "ID товара", required = true)
        @PathVariable Long id
    ) { }
    
    @PostMapping
    @Operation(summary = "Создать товар")
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<ProductDto> create(
        @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Данные для создания товара",
            required = true
        )
        @Valid @RequestBody ProductCreateDto dto
    ) { }
}
```

---

## 🔒 Обработка ошибок

### Исключения
```java
// Базовое исключение
public abstract class BusinessException extends RuntimeException {
    private final String code;
    private final HttpStatus status;
    
    protected BusinessException(String code, String message, HttpStatus status) {
        super(message);
        this.code = code;
        this.status = status;
    }
}

// Конкретные исключения
@ResponseStatus(HttpStatus.NOT_FOUND)
public class NotFoundException extends BusinessException {
    public NotFoundException(String entity, Long id) {
        super("NOT_FOUND", entity + " не найден с ID: " + id, HttpStatus.NOT_FOUND);
    }
}

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class ValidationException extends BusinessException {
    public ValidationException(String message) {
        super("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST);
    }
}

@ResponseStatus(HttpStatus.CONFLICT)
public class AlreadyExistsException extends BusinessException {
    public AlreadyExistsException(String entity, String field, String value) {
        super("ALREADY_EXISTS", entity + " с " + field + " '" + value + "' уже существует", HttpStatus.CONFLICT);
    }
}
```

### Global Exception Handler
```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(NotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ResponseEntity<ApiError> handleNotFound(NotFoundException ex) {
        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(ApiError.builder()
                .code(ex.getCode())
                .message(ex.getMessage())
                .timestamp(LocalDateTime.now())
                .build());
    }
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
        String errors = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(error -> error.getField() + ": " + error.getDefaultMessage())
            .collect(Collectors.joining(", "));
        
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ApiError.builder()
                .code("VALIDATION_ERROR")
                .message(errors)
                .timestamp(LocalDateTime.now())
                .build());
    }
    
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ResponseEntity<ApiError> handleGeneric(Exception ex) {
        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ApiError.builder()
                .code("INTERNAL_ERROR")
                .message("Произошла непредвиденная ошибка")
                .timestamp(LocalDateTime.now())
                .build());
    }
}
```

---

## 🧪 Тестирование

### Unit тесты
```java
@ExtendWith(MockitoExtension.class)
class ProductServiceTest {
    
    @Mock
    private ProductRepository repository;
    
    @Mock
    private ProductMapper mapper;
    
    @InjectMocks
    private ProductServiceImpl service;
    
    @Test
    @DisplayName("Найти товар по ID")
    void findById_shouldReturnProduct() {
        // Arrange
        Long id = 1L;
        Product product = new Product(id, "SKU001", "Test", BigDecimal.TEN);
        ProductDto expected = new ProductDto(id, "SKU001", "Test", BigDecimal.TEN);
        
        when(repository.findById(id)).thenReturn(Optional.of(product));
        when(mapper.toDto(product)).thenReturn(expected);
        
        // Act
        ProductDto result = service.findById(id);
        
        // Assert
        assertThat(result).isEqualTo(expected);
        verify(repository).findById(id);
        verify(mapper).toDto(product);
    }
    
    @Test
    @DisplayName("Товар не найден")
    void findById_shouldThrowNotFoundException() {
        // Arrange
        Long id = 1L;
        when(repository.findById(id)).thenReturn(Optional.empty());
        
        // Act & Assert
        assertThatThrownBy(() -> service.findById(id))
            .isInstanceOf(NotFoundException.class)
            .hasMessageContaining("не найден");
    }
}
```

### Integration тесты
```java
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class ProductControllerIntegrationTest {
    
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        .withDatabaseName("test_warehouse")
        .withUsername("test")
        .withPassword("test");
    
    @DynamicPropertySource
    static void configureTestProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }
    
    @Autowired
    private MockMvc mockMvc;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @Test
    @DisplayName("Создание товара")
    void createProduct_shouldReturnCreated() throws Exception {
        // Arrange
        var dto = new ProductCreateDto("SKU001", "Test Product", BigDecimal.TEN, 1L);
        
        // Act & Assert
        mockMvc.perform(post("/api/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.sku").value("SKU001"))
            .andExpect(jsonPath("$.name").value("Test Product"));
    }
}
```

---

## 📄 JavaDoc

```java
/**
 * Сервис для управления товарами.
 * <p>
 * Предоставляет методы для CRUD операций с товарами,
 * а также для поиска и фильтрации.
 *
 * @author Your Name
 * @since 1.0.0
 */
@Service
@RequiredArgsConstructor
public class ProductService {
    
    /**
     * Находит товар по идентификатору.
     *
     * @param id идентификатор товара
     * @return найденный товар
     * @throws NotFoundException если товар не найден
     */
    public ProductDto findById(Long id) { }
    
    /**
     * Создаёт новый товар.
     *
     * @param dto данные для создания
     * @return созданный товар
     * @throws AlreadyExistsException если товар с таким SKU уже существует
     */
    public ProductDto create(ProductCreateDto dto) { }
    
    /**
     * Ищет товары по названию.
     *
     * @param name часть названия (регистронезависимый поиск)
     * @return список найденных товаров
     */
    public List<ProductDto> searchByName(String name) { }
}
```

---

## 🔄 Git Commit Messages

### Формат
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Типы коммитов
- `feat` — новая функциональность
- `fix` — исправление бага
- `docs` — документация
- `style` — форматирование
- `refactor` — рефакторинг
- `test` — тесты
- `chore` — сборка, зависимости

### Примеры
```
feat(product): добавить поиск товаров по артикулу

- Добавлен метод searchBySku в ProductService
- Добавлен endpoint GET /api/products/search?sku=
- Добавлены тесты

Closes #123

fix(receipt): исправление проведения документа поступления

Исправлена ошибка расчёта остатков при проведении документа

Refs #456

refactor(auth): упрощение JWT сервиса

- Удалены дублирующиеся методы
- Объединены методы валидации токена
```
