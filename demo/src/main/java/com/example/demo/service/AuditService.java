package com.example.demo.service;

import com.example.demo.entity.AuditLog;
import com.example.demo.entity.User;
import com.example.demo.exception.NotFoundException;
import com.example.demo.repository.AuditLogRepository;
import com.example.demo.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuditService {
    private final AuditLogRepository repo;
    private final ObjectMapper mapper;
    private final UserRepository userRepository;

    /**
     * Логирование операции с объектом User.
     */
    public void log(User actor, String action, String entity, Long entityId, Object before, Object after) {
        AuditLog log = AuditLog.builder()
                .actor(actor)
                .action(action)
                .entity(entity)
                .entityId(entityId)
                .beforeJson(before != null ? mapper.valueToTree(before) : null)
                .afterJson(after != null ? mapper.valueToTree(after) : null)
                .build();
        repo.save(log);
    }

    /**
     * Логирование операции по ID пользователя (когда нет объекта User под рукой).
     */
    public void logById(Long actorId, String action, String entity, Long entityId, Object before, Object after) {
        User actor = actorId != null ? userRepository.findById(actorId).orElse(null) : null;
        log(actor, action, entity, entityId, before, after);
    }
}


