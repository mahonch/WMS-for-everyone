package com.example.demo.dto.catalog;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

/**
 * DTO для товаров.
 */
public class ProductDtos {

    /**
     * DTO для создания товара.
     */
    public record Create(
            @NotBlank(message = "Артикул обязателен") String sku,
            @NotBlank(message = "Название обязательно") String name,
            String barcode,
            @NotNull(message = "Категория обязательна") Long categoryId,
            @NotBlank(message = "Единица измерения обязательна") String unit,
            @Min(value = 0, message = "Минимальный остаток не может быть отрицательным") int minStock,
            @DecimalMin(value = "0.0", inclusive = true, message = "Цена не может быть отрицательной") BigDecimal costPrice,
            Boolean isActive,
            String imageUrl
    ) {}

    /**
     * DTO для обновления товара.
     */
    public record Update(
            @NotBlank(message = "Артикул обязателен") String sku,
            @NotBlank(message = "Название обязательно") String name,
            String barcode,
            @NotNull(message = "Категория обязательна") Long categoryId,
            @NotBlank(message = "Единица измерения обязательна") String unit,
            @Min(value = 0, message = "Минимальный остаток не может быть отрицательным") int minStock,
            @DecimalMin(value = "0.0", inclusive = true, message = "Цена не может быть отрицательной") BigDecimal costPrice,
            Boolean isActive,
            String imageUrl
    ) {}

    /**
     * DTO для отображения товара.
     */
    public record View(
            Long id,
            String sku,
            String name,
            String barcode,
            Long categoryId,
            String categoryName,
            String unit,
            Integer minStock,
            BigDecimal costPrice,
            Boolean isActive,
            String imageUrl
    ) {}
}
