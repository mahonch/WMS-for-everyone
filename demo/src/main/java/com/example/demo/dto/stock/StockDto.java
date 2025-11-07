package com.example.demo.dto.stock;

import java.io.Serializable;

public record StockDto(
        Long id,
        Long productId,
        Long locationId,
        Long batchId,
        int qty
) implements Serializable {}
