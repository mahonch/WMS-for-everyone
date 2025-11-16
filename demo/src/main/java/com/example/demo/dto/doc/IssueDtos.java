package com.example.demo.dto.doc;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class IssueDtos {

    public record Create(
            @NotNull Long createdById,
            String number,
            String reason,
            List<ItemCreate> items
    ) {}

    public record ItemCreate(
            @NotNull Long productId,
            Long batchId,
            @NotNull @Min(1) Integer qty
    ) {}

    public record ItemUpdate(
            @NotNull Long productId,
            Long batchId,
            @NotNull @Min(1) Integer qty
    ) {}

    public record View(
            Long id,
            String number,
            String status,
            Long createdBy,
            String reason,
            LocalDateTime createdAt,
            List<ViewItem> items
    ) {}

    public record ViewItem(
            Long id,
            Long productId,
            Long batchId,
            Integer qty,
            BigDecimal costPrice
    ) {}
}
