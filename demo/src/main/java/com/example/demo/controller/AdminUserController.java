package com.example.demo.controller;

import com.example.demo.entity.User;
import com.example.demo.service.AdminUserService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final AdminUserService service;

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

    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@PathVariable Long id) {
        service.safeDelete(id);
        return Map.of("ok", true);
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

    @Data
    public static class UserDto {
        Long id;
        String username;
        String email;
        boolean active;
        String role;

        static UserDto of(User u) {
            var dto = new UserDto();
            dto.id = u.getId();
            dto.username = u.getUsername();
            dto.email = u.getEmail();
            dto.active = Boolean.TRUE.equals(u.getActive());
            dto.role = u.getRoles().isEmpty()
                    ? "GUEST"
                    : u.getRoles().iterator().next().getCode();
            return dto;
        }
    }
}
