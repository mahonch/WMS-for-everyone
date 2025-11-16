package com.example.demo.dto;

import com.example.demo.entity.AuditLog;

import java.time.LocalDateTime;

public record AuditLogDto(
        Long id,
        String action,
        String entity,
        Long entityId,
        LocalDateTime ts,
        String actor
) {
    public static AuditLogDto of(AuditLog a) {
        return new AuditLogDto(
                a.getId(),
                a.getAction(),
                a.getEntity(),
                a.getEntityId(),
                a.getTs(),
                a.getActor() != null ? a.getActor().getUsername() : "system"
        );
    }
}
