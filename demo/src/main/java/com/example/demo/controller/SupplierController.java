package com.example.demo.controller;

import com.example.demo.dto.catalog.SupplierDto;
import com.example.demo.dto.catalog.SupplierSearchParams;
import com.example.demo.security.CustomUserDetails;
import com.example.demo.service.SupplierService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Контроллер для управления поставщиками.
 */
@RestController
@RequestMapping("/api/suppliers")
@RequiredArgsConstructor
public class SupplierController {

    private final SupplierService supplierService;

    /**
     * Получить всех поставщиков с пагинацией.
     */
    @GetMapping
    public Page<SupplierDto.View> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "id") String sort,
            @RequestParam(defaultValue = "DESC") String direction
    ) {
        Sort.Direction dir = direction.equalsIgnoreCase("ASC") ? Sort.Direction.ASC : Sort.Direction.DESC;
        return supplierService.findAll(PageRequest.of(page, size, Sort.by(dir, sort)));
    }

    /**
     * Поиск поставщиков по фильтрам.
     */
    @GetMapping("/search")
    public Page<SupplierDto.View> search(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String inn,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String phone,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        SupplierSearchParams params = SupplierSearchParams.builder()
                .name(name)
                .inn(inn)
                .email(email)
                .phone(phone)
                .build();
        return supplierService.search(params, PageRequest.of(page, size, Sort.by("id").descending()));
    }

    /**
     * Получить поставщика по ID.
     */
    @GetMapping("/{id}")
    public SupplierDto.View get(@PathVariable Long id) {
        return supplierService.findById(id);
    }

    /**
     * Создать поставщика.
     */
    @PostMapping
    public ResponseEntity<SupplierDto.View> create(
            @Valid @RequestBody SupplierDto.Create dto,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        Long actorId = userDetails != null ? userDetails.getId() : null;
        SupplierDto.View created = supplierService.create(dto, actorId);
        return ResponseEntity.ok(created);
    }

    /**
     * Обновить поставщика.
     */
    @PutMapping("/{id}")
    public ResponseEntity<SupplierDto.View> update(
            @PathVariable Long id,
            @Valid @RequestBody SupplierDto.Update dto,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        Long actorId = userDetails != null ? userDetails.getId() : null;
        SupplierDto.View updated = supplierService.update(id, dto, actorId);
        return ResponseEntity.ok(updated);
    }

    /**
     * Удалить поставщика.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        Long actorId = userDetails != null ? userDetails.getId() : null;
        supplierService.deleteById(id, actorId);
        return ResponseEntity.ok().build();
    }
}
