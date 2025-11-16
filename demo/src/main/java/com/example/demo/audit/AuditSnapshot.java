package com.example.demo.audit;

import java.time.LocalDateTime;
import java.util.List;

public record AuditSnapshot(
        Long id,
        String number,
        String status,
        LocalDateTime createdAt,
        String createdBy,
        String reason,
        List<Item> items
) {
    public record Item(
            Long id,
            Long productId,
            Long batchId,
            Integer qty,
            String costPrice
    ) {}
}
