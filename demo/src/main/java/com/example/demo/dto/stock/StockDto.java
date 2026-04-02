package com.example.demo.dto.stock;

import java.io.Serializable;
import java.math.BigDecimal;

public record StockDto(
        Long id,
        Long productId,
        String productName,
        String sku,
        String categoryName,
        Long warehouseId,
        String warehouseName,
        Long locationId,
        String locationCode,
        String locationType,
        Long batchId,
        String lotNumber,
        int qty,
        BigDecimal costPrice
) implements Serializable {}
