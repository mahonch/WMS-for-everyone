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
            String reasonCode,
            List<ItemCreate> items,
            Long targetWarehouseId,
            Long targetLocationId
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
            String createdByName,
            Long committedBy,
            String committedByName,
            LocalDateTime committedAt,
            String reason,
            String reasonCode,
            LocalDateTime createdAt,
            List<ViewItem> items,
            Long targetWarehouseId,
            String targetWarehouseName,
            Long targetLocationId,
            String targetLocationCode
    ) {}

    public record ViewItem(
            Long id,
            Long productId,
            Long batchId,
            Integer qty,
            BigDecimal costPrice
    ) {}
}
