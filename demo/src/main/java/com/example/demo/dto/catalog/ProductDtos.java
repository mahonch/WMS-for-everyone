package com.example.demo.dto.catalog;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public class ProductDtos {
    public record Create(
            @NotBlank String sku,
            @NotBlank String name,
            String barcode,
            @NotNull Long categoryId,
            @NotBlank String unit,
            @Min(0) int minStock,
            @DecimalMin(value = "0.0", inclusive = true) BigDecimal costPrice,
            Boolean isActive,
            String imageUrl
    ) {}

    public record Update(
            @NotBlank String name,
            String barcode,
            @NotNull Long categoryId,
            @NotBlank String unit,
            @Min(0) int minStock,
            @DecimalMin(value = "0.0", inclusive = true) BigDecimal costPrice,
            Boolean isActive,
            String imageUrl
    ) {}

    public record View(
            Long id, String sku, String name, String barcode,
            Long categoryId, String unit, Integer minStock,
            BigDecimal costPrice, Boolean isActive, String imageUrl
    ) {}
}
