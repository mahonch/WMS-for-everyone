package com.example.demo.dto.catalog;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

/**
 * Параметры поиска товаров.
 */
@Data
@Builder
public class ProductSearchParams {
    private String sku;           // поиск по артикулу (частичное совпадение)
    private String name;          // поиск по названию (частичное совпадение)
    private String barcode;       // поиск по штрих-коду (точное или частичное)
    private Long categoryId;      // фильтр по категории
    private Boolean isActive;     // фильтр по активности
    private BigDecimal minPrice;  // минимальная цена
    private BigDecimal maxPrice;  // максимальная цена
}
