package com.example.demo.dto.worker;

import com.example.demo.entity.enums.TaskStatus;
import com.example.demo.entity.enums.TaskType;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO для задач работников.
 */
public class TaskDtos {

    public record View(
            Long id,
            String number,
            String type,
            String status,
            Long warehouseId,
            String warehouseName,
            Long assigneeId,
            String assigneeName,
            Long createdById,
            String createdByName,
            Long relatedReceiptId,
            Long relatedIssueId,
            Long routeId,
            Long shipmentLocationId,
            String shipmentLocationCode,
            Boolean shipmentConfirmed,
            String notes,
            LocalDateTime createdAt,
            LocalDateTime assignedAt,
            LocalDateTime startedAt,
            LocalDateTime completedAt,
            List<ViewItem> items
    ) {}

    public record ViewItem(
            Long id,
            Long productId,
            String productName,
            String productSku,
            String productImageUrl,
            Long locationId,
            String locationCode,
            String locationName,
            Integer qtyPlanned,
            Integer qtyActual,
            Boolean confirmed,
            Integer sortOrder
    ) {}

    public record Create(
            String type,
            Long warehouseId,
            Long relatedReceiptId,
            Long relatedIssueId,
            String notes,
            List<ItemCreate> items
    ) {}

    public record ItemCreate(
            Long productId,
            Long locationId,
            Integer qtyPlanned,
            Integer sortOrder
    ) {}

    public record AssignReq(
            Long userId
    ) {}

    public record ConfirmItemReq(
            Long itemId,
            Integer qtyActual
    ) {}

    public record ConfirmShipmentReq(
            Long locationId
    ) {}
}
