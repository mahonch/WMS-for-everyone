package com.example.demo.dto.doc;

import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.List;

public class TransferDtos {

    public record Create(
            @NotNull Long createdById,
            @NotNull Long fromLocationId,
            @NotNull Long toLocationId,
            String number
    ) {}

    public record ItemCreate(
            @NotNull Long productId,
            @NotNull Long batchId,
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
            Long fromLocationId,
            String fromLocationCode,
            Long fromWarehouseId,
            String fromWarehouseName,
            Long toLocationId,
            String toLocationCode,
            Long toWarehouseId,
            String toWarehouseName,
            LocalDateTime createdAt,
            List<ViewItem> items
    ) {}

    public record ViewItem(
            Long id,
            Long productId,
            Long batchId,
            Integer qty
    ) {}
}
