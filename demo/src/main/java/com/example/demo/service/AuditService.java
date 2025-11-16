package com.example.demo.service;

import com.example.demo.entity.AuditLog;
import com.example.demo.entity.User;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.example.demo.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public void log(User actor, String action, String entity,
                    Long entityId, Object before, Object after) {

        JsonNode beforeJson = toJson(before);
        JsonNode afterJson = toJson(after);

        AuditLog log = AuditLog.builder()
                .actor(actor)
                .action(action)
                .entity(entity)
                .entityId(entityId)
                .beforeJson(beforeJson != null ? beforeJson.toString() : null)
                .afterJson(afterJson != null ? afterJson.toString() : null)
                .build();

        auditLogRepository.save(log);
    }

    private JsonNode toJson(Object o) {
        try { return o == null ? null : objectMapper.valueToTree(o); }
        catch (Exception e) { return null; }
    }
}
