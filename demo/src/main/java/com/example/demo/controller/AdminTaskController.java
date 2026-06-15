package com.example.demo.controller;

import com.example.demo.entity.Task;
import com.example.demo.entity.enums.TaskStatus;
import com.example.demo.entity.enums.TaskType;
import com.example.demo.repository.TaskRepository;
import com.example.demo.repository.UserRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/tasks")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
public class AdminTaskController {

    private final TaskRepository taskRepo;
    private final UserRepository userRepo;

    @GetMapping
    public Page<TaskDto> list(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        var pageable = PageRequest.of(page, size);
        TaskType taskType = null;
        TaskStatus taskStatus = null;

        if (type != null && !type.isBlank()) {
            try { taskType = TaskType.valueOf(type.toUpperCase()); } catch (Exception ignored) {}
        }
        if (status != null && !status.isBlank()) {
            try { taskStatus = TaskStatus.valueOf(status.toUpperCase()); } catch (Exception ignored) {}
        }

        Page<Task> tasks;
        if (taskType != null && taskStatus != null) {
            tasks = taskRepo.findByStatusAndTypeOrderByCreatedAtDesc(taskStatus, taskType, pageable);
        } else if (taskType != null) {
            tasks = taskRepo.findByTypeOrderByCreatedAtDesc(taskType, pageable);
        } else if (taskStatus != null) {
            tasks = taskRepo.findByStatusOrderByCreatedAtDesc(taskStatus, pageable);
        } else {
            tasks = taskRepo.findAllByOrderByCreatedAtDesc(pageable);
        }

        return tasks.map(TaskDto::of);
    }

    @GetMapping("/stats")
    public Map<String, Object> stats() {
        long pending = taskRepo.countByStatus(TaskStatus.PENDING);
        long assigned = taskRepo.countByStatus(TaskStatus.ASSIGNED);
        long inProgress = taskRepo.countByStatus(TaskStatus.IN_PROGRESS);
        long completed = taskRepo.countByStatus(TaskStatus.COMPLETED);
        long cancelled = taskRepo.countByStatus(TaskStatus.CANCELLED);
        long pickingTotal = taskRepo.countByType(TaskType.PICKING);
        long receiptTotal = taskRepo.countByType(TaskType.RECEIPT);

        return Map.of(
                "pending", pending,
                "assigned", assigned,
                "inProgress", inProgress,
                "completed", completed,
                "cancelled", cancelled,
                "pickingTotal", pickingTotal,
                "receiptTotal", receiptTotal
        );
    }

    @PostMapping("/{id}/assign")
    public TaskDto assign(@PathVariable Long id, @RequestBody AssignReq req) {
        var task = taskRepo.findById(id).orElseThrow(() -> new RuntimeException("Task not found"));
        if (task.getStatus() != TaskStatus.PENDING) {
            throw new RuntimeException("Можно назначить только задачу со статусом PENDING");
        }
        var user = userRepo.findById(req.userId).orElseThrow(() -> new RuntimeException("User not found"));
        task.setAssignee(user);
        task.setStatus(TaskStatus.ASSIGNED);
        task.setAssignedAt(java.time.LocalDateTime.now());
        taskRepo.save(task);
        return TaskDto.of(task);
    }

    @PostMapping("/{id}/cancel")
    public TaskDto cancel(@PathVariable Long id) {
        var task = taskRepo.findById(id).orElseThrow(() -> new RuntimeException("Task not found"));
        if (task.getStatus() == TaskStatus.COMPLETED) {
            throw new RuntimeException("Нельзя отменить завершённую задачу");
        }
        task.setStatus(TaskStatus.CANCELLED);
        taskRepo.save(task);
        return TaskDto.of(task);
    }

    @Data
    public static class AssignReq {
        Long userId;
    }

    @Data
    public static class TaskDto {
        Long id;
        String number;
        String type;
        String status;
        Long warehouseId;
        String warehouseName;
        Long assigneeId;
        String assigneeName;
        String createdByName;
        Long relatedReceiptId;
        Long relatedIssueId;
        int itemCount;
        int itemsConfirmed;
        String notes;
        String createdAt;
        String assignedAt;
        String startedAt;
        String completedAt;

        static TaskDto of(Task t) {
            var dto = new TaskDto();
            dto.id = t.getId();
            dto.number = t.getNumber();
            dto.type = t.getType().name();
            dto.status = t.getStatus().name();
            dto.warehouseId = t.getWarehouse() != null ? t.getWarehouse().getId() : null;
            dto.warehouseName = t.getWarehouse() != null ? t.getWarehouse().getName() : null;
            dto.assigneeId = t.getAssignee() != null ? t.getAssignee().getId() : null;
            dto.assigneeName = t.getAssignee() != null ? t.getAssignee().getUsername() : null;
            dto.createdByName = t.getCreatedBy() != null ? t.getCreatedBy().getUsername() : null;
            dto.relatedReceiptId = t.getRelatedReceipt() != null ? t.getRelatedReceipt().getId() : null;
            dto.relatedIssueId = t.getRelatedIssue() != null ? t.getRelatedIssue().getId() : null;
            dto.itemCount = t.getItems() != null ? t.getItems().size() : 0;
            dto.itemsConfirmed = t.getItems() != null ? (int) t.getItems().stream().filter(i -> Boolean.TRUE.equals(i.getConfirmed())).count() : 0;
            dto.notes = t.getNotes();
            dto.createdAt = t.getCreatedAt() != null ? t.getCreatedAt().toString() : null;
            dto.assignedAt = t.getAssignedAt() != null ? t.getAssignedAt().toString() : null;
            dto.startedAt = t.getStartedAt() != null ? t.getStartedAt().toString() : null;
            dto.completedAt = t.getCompletedAt() != null ? t.getCompletedAt().toString() : null;
            return dto;
        }
    }
}
