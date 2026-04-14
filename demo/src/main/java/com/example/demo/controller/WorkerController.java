package com.example.demo.controller;

import com.example.demo.dto.worker.WorkerShiftDtos;
import com.example.demo.security.CustomUserDetails;
import com.example.demo.service.WorkerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/workers")
@RequiredArgsConstructor
public class WorkerController {

    private final WorkerService workerService;

    /**
     * Мой профиль и статус смены.
     */
    @GetMapping("/me")
    public ResponseEntity<WorkerProfile> getProfile(@AuthenticationPrincipal CustomUserDetails userDetails) {
        Long userId = userDetails.getId();
        WorkerShiftDtos.View shift = workerService.getCurrentShift(userId);
        WorkerService.WorkerStats stats = workerService.getWorkerStats(userId);
        return ResponseEntity.ok(new WorkerProfile(userId, userDetails.getUsername(), shift, stats));
    }

    /**
     * Начать смену.
     */
    @PostMapping("/me/shift/start")
    public ResponseEntity<WorkerShiftDtos.View> startShift(@AuthenticationPrincipal CustomUserDetails userDetails) {
        WorkerShiftDtos.View shift = workerService.startShift(userDetails.getId());
        return ResponseEntity.ok(shift);
    }

    /**
     * Завершить смену.
     */
    @PostMapping("/me/shift/end")
    public ResponseEntity<WorkerShiftDtos.View> endShift(@AuthenticationPrincipal CustomUserDetails userDetails) {
        WorkerShiftDtos.View shift = workerService.endShift(userDetails.getId());
        return ResponseEntity.ok(shift);
    }

    public record WorkerProfile(
            Long userId,
            String username,
            WorkerShiftDtos.View currentShift,
            WorkerService.WorkerStats stats
    ) {}
}
