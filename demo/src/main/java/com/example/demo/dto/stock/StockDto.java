package com.example.demo.dto.stock;

import java.io.Serializable;

public record StockDto(
        Long id,
        Long productId,
        String productName,
        Long locationId,
        String locationCode,
        Long batchId,
        String lotNumber,
        int qty
) implements Serializable {}
