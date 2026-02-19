package com.example.demo.controller;

import com.example.demo.dto.catalog.ProductDtos;
import com.example.demo.dto.catalog.ProductSearchParams;
import com.example.demo.security.CustomUserDetails;
import com.example.demo.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Контроллер для управления товарами.
 */
@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    /**
     * Получить все товары с пагинацией.
     */
    @GetMapping
    public Page<ProductDtos.View> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "id") String sort,
            @RequestParam(defaultValue = "DESC") String direction
    ) {
        Sort.Direction dir = direction.equalsIgnoreCase("ASC") ? Sort.Direction.ASC : Sort.Direction.DESC;
        return productService.findAll(PageRequest.of(page, size, Sort.by(dir, sort)));
    }

    /**
     * Поиск товаров по фильтрам.
     */
    @GetMapping("/search")
    public Page<ProductDtos.View> search(
            @RequestParam(required = false) String sku,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String barcode,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        ProductSearchParams params = ProductSearchParams.builder()
                .sku(sku)
                .name(name)
                .barcode(barcode)
                .categoryId(categoryId)
                .isActive(isActive)
                .build();
        return productService.search(params, PageRequest.of(page, size, Sort.by("id").descending()));
    }

    /**
     * Получить товар по ID.
     */
    @GetMapping("/{id}")
    public ProductDtos.View get(@PathVariable Long id) {
        return productService.findById(id);
    }

    /**
     * Получить товар по артикулу (SKU).
     */
    @GetMapping("/by-sku/{sku}")
    public ProductDtos.View bySku(@PathVariable String sku) {
        return productService.findBySku(sku);
    }

    /**
     * Получить товар по штрих-коду.
     */
    @GetMapping("/by-barcode/{barcode}")
    public ProductDtos.View byBarcode(@PathVariable String barcode) {
        return productService.findByBarcode(barcode);
    }

    /**
     * Создать товар.
     */
    @PostMapping
    public ResponseEntity<ProductDtos.View> create(
            @Valid @RequestBody ProductDtos.Create dto,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        System.out.println("[ProductController.create] dto: " + dto);
        try {
            Long actorId = userDetails != null ? userDetails.getId() : null;
            ProductDtos.View created = productService.create(dto, actorId);
            System.out.println("[ProductController.create] created: " + created);
            return ResponseEntity.ok(created);
        } catch (Exception e) {
            System.err.println("[ProductController.create] error: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    /**
     * Обновить товар.
     */
    @PutMapping("/{id}")
    public ResponseEntity<ProductDtos.View> update(
            @PathVariable Long id,
            @Valid @RequestBody ProductDtos.Update dto,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        Long actorId = userDetails != null ? userDetails.getId() : null;
        ProductDtos.View updated = productService.update(id, dto, actorId);
        return ResponseEntity.ok(updated);
    }

    /**
     * Удалить товар.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        Long actorId = userDetails != null ? userDetails.getId() : null;
        productService.deleteById(id, actorId);
        return ResponseEntity.ok().build();
    }
}
