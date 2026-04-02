package com.example.demo.controller;

import com.example.demo.entity.User;
import com.example.demo.entity.Warehouse;
import com.example.demo.repository.UserRepository;
import com.example.demo.repository.WarehouseRepository;
import jakarta.transaction.Transactional;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Контроллер для управления профилем текущего пользователя
 */
@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final UserRepository userRepository;
    private final WarehouseRepository warehouseRepository;

    /**
     * Получить текущий профиль пользователя
     */
    @GetMapping
    public ProfileDto getProfile(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ProfileDto.of(user, warehouseRepository);
    }

    /**
     * Обновить профиль пользователя (email, warehouse)
     */
    @PutMapping
    @Transactional
    public ProfileDto updateProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody UpdateProfileReq req
    ) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (req.getEmail() != null) {
            user.setEmail(req.getEmail());
        }
        if (req.getWarehouseId() != null) {
            user.setWarehouseId(req.getWarehouseId());
        }

        userRepository.save(user);
        return ProfileDto.of(user, warehouseRepository);
    }

    /**
     * Получить список доступных складов для выбора
     */
    @GetMapping("/warehouses")
    public List<WarehouseOptionDto> getAvailableWarehouses() {
        return warehouseRepository.findAll().stream()
                .map(w -> new WarehouseOptionDto(w.getId(), w.getName(), w.getCode()))
                .toList();
    }

    // DTO ----------------------------------------------------------------

    @Data
    public static class ProfileDto {
        Long id;
        String username;
        String email;
        Long warehouseId;
        String warehouseName;
        String role;

        static ProfileDto of(User u, WarehouseRepository warehouseRepository) {
            var dto = new ProfileDto();
            dto.id = u.getId();
            dto.username = u.getUsername();
            dto.email = u.getEmail();
            dto.warehouseId = u.getWarehouseId();
            dto.role = u.getRoles().isEmpty()
                    ? "GUEST"
                    : u.getRoles().iterator().next().getCode();
            // Заполняем warehouseName через репозиторий
            if (u.getWarehouseId() != null) {
                Warehouse wh = warehouseRepository.findById(u.getWarehouseId()).orElse(null);
                dto.warehouseName = wh != null ? wh.getName() : null;
            }
            return dto;
        }
        
        static ProfileDto of(User u) {
            return of(u, null);
        }
    }

    @Data
    public static class UpdateProfileReq {
        String email;
        Long warehouseId;
    }

    @Data
    public static class WarehouseOptionDto {
        Long id;
        String name;
        String code;

        public WarehouseOptionDto(Long id, String name, String code) {
            this.id = id;
            this.name = name;
            this.code = code;
        }
    }
}
