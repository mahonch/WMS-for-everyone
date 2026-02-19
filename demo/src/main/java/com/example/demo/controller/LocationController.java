package com.example.demo.controller;

import com.example.demo.dto.warehouse.LocationDto;
import com.example.demo.dto.warehouse.LocationSearchParams;
import com.example.demo.security.CustomUserDetails;
import com.example.demo.service.LocationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Контроллер для управления локациями (ячейками хранения).
 */
@RestController
@RequestMapping("/api/locations")
@RequiredArgsConstructor
public class LocationController {

    private final LocationService locationService;

    /**
     * Получить все локации списком.
     */
    @GetMapping
    public List<LocationDto.View> list() {
        return locationService.findAllList();
    }

    /**
     * Поиск локаций по фильтрам.
     */
    @GetMapping("/search")
    public Page<LocationDto.View> search(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) Long parentId,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        LocationSearchParams params = LocationSearchParams.builder()
                .code(code)
                .name(name)
                .warehouseId(warehouseId)
                .parentId(parentId)
                .type(type != null ? com.example.demo.entity.enums.LocationType.valueOf(type) : null)
                .build();
        return locationService.search(params, PageRequest.of(page, size, Sort.by("id").descending()));
    }

    /**
     * Получить локацию по ID.
     */
    @GetMapping("/{id}")
    public LocationDto.View get(@PathVariable Long id) {
        return locationService.findById(id);
    }

    /**
     * Получить локации по складу.
     */
    @GetMapping("/warehouse/{warehouseId}")
    public List<LocationDto.View> getByWarehouse(@PathVariable Long warehouseId) {
        return locationService.findByWarehouseId(warehouseId);
    }

    /**
     * Создать локацию.
     */
    @PostMapping
    public ResponseEntity<LocationDto.View> create(
            @Valid @RequestBody LocationDto.Create dto,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        System.out.println("[LocationController.create] dto: " + dto);
        try {
            Long actorId = userDetails != null ? userDetails.getId() : null;
            LocationDto.View created = locationService.create(dto, actorId);
            System.out.println("[LocationController.create] created: " + created);
            return ResponseEntity.ok(created);
        } catch (Exception e) {
            System.err.println("[LocationController.create] error: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    /**
     * Обновить локацию.
     */
    @PutMapping("/{id}")
    public ResponseEntity<LocationDto.View> update(
            @PathVariable Long id,
            @Valid @RequestBody LocationDto.Update dto,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        Long actorId = userDetails != null ? userDetails.getId() : null;
        LocationDto.View updated = locationService.update(id, dto, actorId);
        return ResponseEntity.ok(updated);
    }

    /**
     * Удалить локацию.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        Long actorId = userDetails != null ? userDetails.getId() : null;
        locationService.deleteById(id, actorId);
        return ResponseEntity.ok().build();
    }
}
