package com.example.demo.controller;

import com.example.demo.dto.worker.TaskDtos;
import com.example.demo.entity.enums.TaskType;
import com.example.demo.security.CustomUserDetails;
import com.example.demo.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    /**
     * Список доступных задач по типу.
     */
    @GetMapping("/available")
    public Page<TaskDtos.View> available(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) TaskType type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return taskService.getAvailableTasks(type,
                PageRequest.of(page, size, Sort.by("createdAt").descending()),
                userDetails != null ? userDetails.getId() : null);
    }

    /**
     * Мои задачи.
     */
    @GetMapping("/my")
    public Page<TaskDtos.View> myTasks(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return taskService.getMyTasks(userDetails.getId(), PageRequest.of(page, size, Sort.by("createdAt").descending()));
    }

    /**
     * Детальная задача.
     */
    @GetMapping("/{id}")
    public TaskDtos.View get(@PathVariable Long id) {
        return taskService.getTask(id);
    }

    /**
     * Взять задачу (назначить себя).
     */
    @PostMapping("/{id}/take")
    public ResponseEntity<TaskDtos.View> take(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(taskService.assignTask(id, userDetails.getId()));
    }

    /**
     * Взять случайную доступную задачу.
     */
    @PostMapping("/take-random")
    public ResponseEntity<TaskDtos.View> takeRandom(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(taskService.takeRandomTask(userDetails.getId()));
    }

    /**
     * Начать выполнение.
     */
    @PostMapping("/{id}/start")
    public ResponseEntity<TaskDtos.View> start(@PathVariable Long id) {
        return ResponseEntity.ok(taskService.startTask(id));
    }

    /**
     * Завершить задачу.
     */
    @PostMapping("/{id}/complete")
    public ResponseEntity<TaskDtos.View> complete(@PathVariable Long id) {
        return ResponseEntity.ok(taskService.completeTask(id));
    }

    /**
     * Подтвердить ячейку отгрузки (для задач сборки).
     */
    @PostMapping("/{id}/shipment/confirm")
    public ResponseEntity<TaskDtos.View> confirmShipment(
            @PathVariable Long id,
            @RequestBody TaskDtos.ConfirmShipmentReq req
    ) {
        if (req == null || req.locationId() == null) {
            throw new IllegalArgumentException("locationId is required");
        }
        return ResponseEntity.ok(taskService.confirmShipmentLocation(id, req.locationId()));
    }

    /**
     * Подтвердить позицию (сканирование).
     */
    @PostMapping("/{id}/items/{itemId}/confirm")
    public ResponseEntity<TaskDtos.ViewItem> confirmItem(
            @PathVariable Long id,
            @PathVariable Long itemId,
            @RequestBody TaskDtos.ConfirmItemReq req
    ) {
        return ResponseEntity.ok(taskService.confirmItem(itemId, req.qtyActual()));
    }
}
