package com.example.demo.dto.stock;

import java.math.BigDecimal;

public record StockBatchDto(
        Long batchId,
        BigDecimal buyPrice,
        Integer qty
) {}
