package com.example.demo.controller;

import com.example.demo.entity.AuditLog;
import com.example.demo.entity.User;
import com.example.demo.entity.enums.ShiftStatus;
import com.example.demo.entity.enums.TaskStatus;
import com.example.demo.entity.enums.TaskType;
import com.example.demo.repository.*;
import com.example.demo.service.AdminUserService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final AdminUserService service;
    private final TaskRepository taskRepo;
    private final WorkerShiftRepository shiftRepo;
    private final AuditLogRepository auditRepo;
    private final WarehouseRepository warehouseRepo;

    @GetMapping
    public List<UserDto> list() {
        return service.findAll().stream().map(UserDto::of).toList();
    }

    @PostMapping
    public UserDto create(@RequestBody CreateUserReq req) {
        var u = service.create(req.username, req.password, req.roleCode, req.email);
        return UserDto.of(u);
    }

    @PutMapping("/{id}/role")
    public UserDto changeRole(@PathVariable Long id, @RequestBody ChangeRoleReq req) {
        var u = service.updateRole(id, req.roleCode);
        return UserDto.of(u);
    }

    @PutMapping("/{id}/status")
    public UserDto changeStatus(@PathVariable Long id, @RequestBody ChangeStatusReq req) {
        var u = service.setActive(id, req.status.equals("ACTIVE"));
        return UserDto.of(u);
    }

    @PutMapping("/{id}/warehouse")
    public UserDto changeWarehouse(@PathVariable Long id, @RequestBody ChangeWarehouseReq req) {
        var u = service.setWarehouse(id, req.warehouseId);
        return UserDto.of(u);
    }

    @GetMapping("/{id}")
    public UserDto getUser(@PathVariable Long id) {
        var u = service.findById(id);
        return UserDto.of(u);
    }

    @PutMapping("/{id}/password")
    public UserDto changePassword(@PathVariable Long id, @RequestBody ChangePasswordReq req) {
        var u = service.changePassword(id, req.password);
        return UserDto.of(u);
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@PathVariable Long id) {
        service.safeDelete(id);
        return Map.of("ok", true);
    }

    // ── Статистика выполненных задач по каждому пользователю ──
    @GetMapping("/stats")
    public List<UserStatsDto> stats() {
        var now = LocalDateTime.now();
        var startOfDay = now.truncatedTo(java.time.temporal.ChronoUnit.DAYS);
        var startOfMonth = now.with(TemporalAdjusters.firstDayOfMonth()).truncatedTo(java.time.temporal.ChronoUnit.DAYS);

        return service.findAll().stream().map(u -> {
            var dto = new UserStatsDto();
            dto.userId = u.getId();

            String role = u.getRoles().isEmpty() ? "GUEST" : u.getRoles().iterator().next().getCode();
            dto.role = role;

            // Для кладовщика — задания типа RECEIPT и TRANSFER
            // Для комплектовщика — задания типа PICKING
            if ("STOREKEEPER".equals(role)) {
                dto.shiftCompleted = taskRepo.countCompletedSince(u.getId(), startOfDay);
                dto.monthCompleted = taskRepo.countCompletedSince(u.getId(), startOfMonth);
                dto.totalCompleted = taskRepo.countByAssigneeIdAndStatus(u.getId(), TaskStatus.COMPLETED);
            } else if ("PICKER".equals(role)) {
                dto.shiftCompleted = taskRepo.countCompletedSince(u.getId(), startOfDay);
                dto.monthCompleted = taskRepo.countCompletedSince(u.getId(), startOfMonth);
                dto.totalCompleted = taskRepo.countByAssigneeIdAndStatus(u.getId(), TaskStatus.COMPLETED);
            }

            return dto;
        }).toList();
    }

    // ── Аудит-лог конкретного пользователя ──
    @GetMapping("/{id}/audit")
    public List<AuditLog> audit(@PathVariable Long id) {
        return auditRepo.findByActorIdOrderByTsDesc(id);
    }

    // DTO ----------------------------------------------------------------

    @Data
    public static class CreateUserReq {
        String username;
        String password;
        String roleCode;
        String email;
    }

    @Data public static class ChangeRoleReq { String roleCode; }

    @Data public static class ChangeStatusReq { String status; }

    @Data public static class ChangeWarehouseReq { Long warehouseId; }

    @Data public static class ChangePasswordReq { String password; }

    @Data
    public static class UserDto {
        Long id;
        String username;
        String email;
        boolean active;
        String role;
        Long warehouseId;
        String warehouseName;

        static UserDto of(User u) {
            var dto = new UserDto();
            dto.id = u.getId();
            dto.username = u.getUsername();
            dto.email = u.getEmail();
            dto.active = Boolean.TRUE.equals(u.getActive());
            dto.role = u.getRoles().isEmpty()
                    ? "GUEST"
                    : u.getRoles().iterator().next().getCode();
            dto.warehouseId = u.getWarehouseId();
            // warehouseName заполняется в сервисе или через JOIN
            return dto;
        }
    }

    @Data
    public static class UserStatsDto {
        Long userId;
        String role;
        long shiftCompleted;
        long monthCompleted;
        long totalCompleted;
    }
}
