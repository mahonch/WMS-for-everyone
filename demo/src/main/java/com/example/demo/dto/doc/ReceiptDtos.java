package com.example.demo.dto.doc;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class ReceiptDtos {

    public record Create(
            Long supplierId,
            Long createdById,
            Long warehouseId,            // опционально: если не указан — берётся из профиля пользователя
            String number,              // опционально: если не указан — сгенерим
            List<ItemCreate> items      // опционально: можно пусто и добавить потом
    ) {}

    public record ItemCreate(
            @NotNull Long productId,
            @NotNull @Min(1) Integer qty,
            @NotNull @DecimalMin("0.0") BigDecimal price,
            Long locationId
    ) {}

    public record ItemUpdate(
            @NotNull Long productId,
            @NotNull @Min(1) Integer qty,
            @NotNull @DecimalMin("0.0") BigDecimal price,
            Long locationId
    ) {}

    public record View(
            Long id,
            String number,
            String status,
            Long supplierId,
            String supplierName,
            Long warehouseId,
            String warehouseName,
            Long createdBy,
            String createdByName,
            LocalDateTime createdAt,
            Long committedBy,
            String committedByName,
            LocalDateTime committedAt,
            BigDecimal totalSum,
            List<ViewItem> items
    ) {}

    public record ViewItem(
            Long id,
            Long productId,
            String productName,
            Integer qty,
            BigDecimal price,
            Long batchId,
            Long locationId,
            String locationName
    ) {}
}
