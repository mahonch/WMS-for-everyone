package com.example.demo.dto.search;

import com.example.demo.entity.enums.DocStatus;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;

public record IssueSearchParams(
        String number,
        DocStatus status,
        Long createdById,
        String reason,
        String sku,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateFrom,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateTo,
        Integer page,
        Integer size
) {
    public int pageOrDefault() { return page == null ? 0 : page; }
    public int sizeOrDefault() { return size == null ? 20 : size; }
}
