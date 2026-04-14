package com.example.demo.dto.worker;

import java.time.LocalDateTime;

/**
 * DTO для смен работников.
 */
public class WorkerShiftDtos {

    public record View(
            Long id,
            Long userId,
            String userName,
            LocalDateTime startedAt,
            LocalDateTime endedAt,
            String status,
            Integer tasksCompleted,
            LocalDateTime createdAt
    ) {}

    public record Create(
            Long userId
    ) {}
}
