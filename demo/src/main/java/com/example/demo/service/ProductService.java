package com.example.demo.service;

import com.example.demo.audit.AuditSnapshot;
import com.example.demo.dto.catalog.ProductDtos;
import com.example.demo.dto.catalog.ProductSearchParams;
import com.example.demo.entity.Category;
import com.example.demo.entity.Product;
import com.example.demo.entity.QrLabel;
import com.example.demo.exception.NotFoundException;
import com.example.demo.repository.CategoryRepository;
import com.example.demo.repository.ProductRepository;
import com.example.demo.repository.QrLabelRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

/**
 * Сервис для управления товарами.
 */
@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final QrLabelRepository qrLabelRepository;
    private final QrService qrService;
    private final AuditService auditService;

    /**
     * Поиск товаров с фильтрами.
     */
    @Transactional(readOnly = true)
    public Page<ProductDtos.View> search(ProductSearchParams params, Pageable pageable) {
        Specification<Product> spec = Specification.where(null);

        if (params.getSku() != null && !params.getSku().isBlank()) {
            spec = spec.and((root, query, cb) ->
                    cb.like(cb.lower(root.get("sku")), "%" + params.getSku().toLowerCase() + "%"));
        }

        if (params.getName() != null && !params.getName().isBlank()) {
            spec = spec.and((root, query, cb) ->
                    cb.like(cb.lower(root.get("name")), "%" + params.getName().toLowerCase() + "%"));
        }

        if (params.getBarcode() != null && !params.getBarcode().isBlank()) {
            spec = spec.and((root, query, cb) ->
                    cb.like(cb.lower(root.get("barcode")), "%" + params.getBarcode().toLowerCase() + "%"));
        }

        if (params.getCategoryId() != null) {
            spec = spec.and((root, query, cb) ->
                    cb.equal(root.get("category").get("id"), params.getCategoryId()));
        }

        if (params.getIsActive() != null) {
            spec = spec.and((root, query, cb) ->
                    cb.equal(root.get("isActive"), params.getIsActive()));
        }

        if (params.getMinPrice() != null) {
            spec = spec.and((root, query, cb) ->
                    cb.greaterThanOrEqualTo(root.get("costPrice"), params.getMinPrice()));
        }

        if (params.getMaxPrice() != null) {
            spec = spec.and((root, query, cb) ->
                    cb.lessThanOrEqualTo(root.get("costPrice"), params.getMaxPrice()));
        }

        return productRepository.findAll(spec, pageable).map(this::toView);
    }

    /**
     * Получить все товары (пагинация).
     */
    @Transactional(readOnly = true)
    public Page<ProductDtos.View> findAll(Pageable pageable) {
        return productRepository.findAll(pageable).map(this::toView);
    }

    /**
     * Получить товар по ID.
     */
    @Transactional(readOnly = true)
    public ProductDtos.View findById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Товар не найден: " + id));
        return toView(product);
    }

    /**
     * Получить товар по артикулу (SKU).
     */
    @Transactional(readOnly = true)
    public ProductDtos.View findBySku(String sku) {
        Product product = productRepository.findBySku(sku)
                .orElseThrow(() -> new NotFoundException("Товар не найден по артикулу: " + sku));
        return toView(product);
    }

    /**
     * Получить товар по штрих-коду.
     */
    @Transactional(readOnly = true)
    public ProductDtos.View findByBarcode(String barcode) {
        Product product = productRepository.findByBarcode(barcode)
                .orElseThrow(() -> new NotFoundException("Товар не найден по штрих-коду: " + barcode));
        return toView(product);
    }

    /**
     * Создать товар.
     */
    @Transactional
    public ProductDtos.View create(ProductDtos.Create dto, Long actorId) {
        // Проверка на дубликат SKU
        productRepository.findBySku(dto.sku()).ifPresent(existing -> {
            throw new IllegalArgumentException("Товар с таким артикулом уже существует");
        });

        // Проверка на дубликат штрих-кода (если указан)
        if (dto.barcode() != null && !dto.barcode().isBlank()) {
            productRepository.findByBarcode(dto.barcode()).ifPresent(existing -> {
                throw new IllegalArgumentException("Товар с таким штрих-кодом уже существует");
            });
        }

        Category category = categoryRepository.findById(dto.categoryId())
                .orElseThrow(() -> new NotFoundException("Категория не найдена: " + dto.categoryId()));

        // Генерация штрих-кода если не указан
        String barcode = dto.barcode();
        if (barcode == null || barcode.isBlank()) {
            barcode = generateBarcode();
        }

        Product product = Product.builder()
                .sku(dto.sku())
                .name(dto.name())
                .barcode(barcode)
                .category(category)
                .unit(dto.unit())
                .minStock(dto.minStock())
                .costPrice(dto.costPrice())
                .isActive(dto.isActive() != null ? dto.isActive() : true)
                .imageUrl(dto.imageUrl())
                .build();

        product = productRepository.save(product);

        // Генерация QR-кода для товара
        String qrPayload = "PRODUCT:" + product.getId() + ":SKU:" + product.getSku();
        QrLabel qrLabel = QrLabel.builder()
                .entityType("PRODUCT")
                .entityId(product.getId())
                .payload(qrPayload)
                .createdAt(java.time.Instant.now())
                .build();
        qrLabelRepository.save(qrLabel);

        // Аудит создания
        auditService.logById(actorId, "PRODUCT_CREATE", "Product", product.getId(), null, toView(product));

        return toView(product);
    }

    /**
     * Генерация уникального штрих-кода EAN-13.
     */
    private String generateBarcode() {
        // Префикс 460-690 (Россия) + 9 цифр + контрольная цифра
        String prefix = "460";
        StringBuilder code = new StringBuilder(prefix);
        
        // Генерируем 9 случайных цифр
        java.util.Random random = new java.util.Random();
        for (int i = 0; i < 9; i++) {
            code.append(random.nextInt(10));
        }
        
        // Вычисляем контрольную цифру EAN-13
        int sum = 0;
        for (int i = 0; i < 12; i++) {
            int digit = Character.getNumericValue(code.charAt(i));
            sum += (i % 2 == 0) ? digit : digit * 3;
        }
        int checkDigit = (10 - (sum % 10)) % 10;
        code.append(checkDigit);
        
        return code.toString();
    }

    /**
     * Обновить товар.
     */
    @Transactional
    public ProductDtos.View update(Long id, ProductDtos.Update dto, Long actorId) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Товар не найден: " + id));

        ProductDtos.View before = toView(product);

        // Проверка на дубликат SKU (если SKU изменился)
        if (!product.getSku().equals(dto.sku())) {
            productRepository.findBySku(dto.sku())
                    .filter(existing -> !existing.getId().equals(id))
                    .ifPresent(existing -> {
                        throw new IllegalArgumentException("Товар с таким артикулом уже существует");
                    });
        }

        // Проверка на дубликат штрих-кода (если штрих-код изменился и указан)
        if (dto.barcode() != null && !dto.barcode().isBlank()
                && (product.getBarcode() == null || !product.getBarcode().equals(dto.barcode()))) {
            productRepository.findByBarcode(dto.barcode())
                    .filter(existing -> !existing.getId().equals(id))
                    .ifPresent(existing -> {
                        throw new IllegalArgumentException("Товар с таким штрих-кодом уже существует");
                    });
        }

        Category category = categoryRepository.findById(dto.categoryId())
                .orElseThrow(() -> new NotFoundException("Категория не найдена: " + dto.categoryId()));

        product.setName(dto.name());
        product.setBarcode(dto.barcode());
        product.setCategory(category);
        product.setUnit(dto.unit());
        product.setMinStock(dto.minStock());
        product.setCostPrice(dto.costPrice());
        if (dto.isActive() != null) {
            product.setIsActive(dto.isActive());
        }
        product.setImageUrl(dto.imageUrl());

        product = productRepository.save(product);

        // Обновление QR-кода если изменился SKU
        Long productId = product.getId();
        String productSku = product.getSku();
        qrLabelRepository.findByEntityTypeAndEntityId("PRODUCT", id).ifPresent(qr -> {
            qr.setPayload("PRODUCT:" + productId + ":SKU:" + productSku);
            qrLabelRepository.save(qr);
        });

        // Аудит обновления
        auditService.logById(actorId, "PRODUCT_UPDATE", "Product", product.getId(), before, toView(product));

        return toView(product);
    }

    /**
     * Удалить товар.
     */
    @Transactional
    public void deleteById(Long id, Long actorId) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Товар не найден: " + id));

        ProductDtos.View before = toView(product);

        // Удаление QR-кода
        qrLabelRepository.findByEntityTypeAndEntityId("PRODUCT", id)
                .ifPresent(qrLabelRepository::delete);

        productRepository.deleteById(id);

        // Аудит удаления
        auditService.logById(actorId, "PRODUCT_DELETE", "Product", id, before, null);
    }

    private ProductDtos.View toView(Product p) {
        return new ProductDtos.View(
                p.getId(),
                p.getSku(),
                p.getName(),
                p.getBarcode(),
                p.getCategory() != null ? p.getCategory().getId() : null,
                p.getCategory() != null ? p.getCategory().getName() : null,
                p.getUnit(),
                p.getMinStock(),
                p.getCostPrice(),
                p.getIsActive(),
                p.getImageUrl()
        );
    }
}
