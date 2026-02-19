package com.example.demo.controller;

import com.example.demo.dto.warehouse.WarehouseDto;
import com.example.demo.dto.warehouse.WarehouseSearchParams;
import com.example.demo.security.CustomUserDetails;
import com.example.demo.service.WarehouseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Контроллер для управления складами.
 */
@RestController
@RequestMapping("/api/warehouses")
@RequiredArgsConstructor
public class WarehouseController {

    private final WarehouseService warehouseService;

    /**
     * Получить все склады с пагинацией.
     */
    @GetMapping
    public Page<WarehouseDto.View> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "id") String sort,
            @RequestParam(defaultValue = "DESC") String direction
    ) {
        Sort.Direction dir = direction.equalsIgnoreCase("ASC") ? Sort.Direction.ASC : Sort.Direction.DESC;
        return warehouseService.findAll(PageRequest.of(page, size, Sort.by(dir, sort)));
    }

    /**
     * Поиск складов по фильтрам.
     */
    @GetMapping("/search")
    public Page<WarehouseDto.View> search(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String code,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        WarehouseSearchParams params = WarehouseSearchParams.builder()
                .name(name)
                .code(code)
                .isActive(isActive)
                .build();
        return warehouseService.search(params, PageRequest.of(page, size, Sort.by("id").descending()));
    }

    /**
     * Получить склад по ID.
     */
    @GetMapping("/{id}")
    public WarehouseDto.View get(@PathVariable Long id) {
        return warehouseService.findById(id);
    }

    /**
     * Создать склад.
     */
    @PostMapping
    public ResponseEntity<WarehouseDto.View> create(
            @Valid @RequestBody WarehouseDto.Create dto,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        Long actorId = userDetails != null ? userDetails.getId() : null;
        WarehouseDto.View created = warehouseService.create(dto, actorId);
        return ResponseEntity.ok(created);
    }

    /**
     * Обновить склад.
     */
    @PutMapping("/{id}")
    public ResponseEntity<WarehouseDto.View> update(
            @PathVariable Long id,
            @Valid @RequestBody WarehouseDto.Update dto,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        Long actorId = userDetails != null ? userDetails.getId() : null;
        WarehouseDto.View updated = warehouseService.update(id, dto, actorId);
        return ResponseEntity.ok(updated);
    }

    /**
     * Удалить склад.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        Long actorId = userDetails != null ? userDetails.getId() : null;
        warehouseService.deleteById(id, actorId);
        return ResponseEntity.ok().build();
    }
}
