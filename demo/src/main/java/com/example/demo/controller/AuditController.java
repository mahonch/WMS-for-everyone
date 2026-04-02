package com.example.demo.controller;

import com.example.demo.dto.AuditLogDto;
import com.example.demo.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
public class AuditController {

    private final AuditLogRepository auditLogRepository;

    @GetMapping("/recent")
    public List<AuditLogDto> recent() {
        return auditLogRepository.findTop5ByOrderByTsDesc()
                .stream()
                .map(AuditLogDto::of)
                .toList();
    }
    
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public List<AuditLogDto> userAudit(@PathVariable Long userId) {
        return auditLogRepository.findByActorIdOrderByTsDesc(userId)
                .stream()
                .map(AuditLogDto::of)
                .toList();
    }
}
