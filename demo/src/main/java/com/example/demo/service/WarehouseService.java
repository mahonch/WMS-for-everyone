package com.example.demo.service;

import com.example.demo.dto.warehouse.WarehouseDto;
import com.example.demo.dto.warehouse.WarehouseSearchParams;
import com.example.demo.entity.Warehouse;
import com.example.demo.exception.NotFoundException;
import com.example.demo.repository.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Сервис для управления складами.
 */
@Service
@RequiredArgsConstructor
public class WarehouseService {

    private final WarehouseRepository warehouseRepository;
    private final AuditService auditService;

    /**
     * Поиск складов с фильтрами.
     */
    @Transactional(readOnly = true)
    public Page<WarehouseDto.View> search(WarehouseSearchParams params, Pageable pageable) {
        Specification<Warehouse> spec = Specification.where(null);

        if (params.getName() != null && !params.getName().isBlank()) {
            spec = spec.and((root, query, cb) ->
                    cb.like(cb.lower(root.get("name")), "%" + params.getName().toLowerCase() + "%"));
        }

        if (params.getCode() != null && !params.getCode().isBlank()) {
            spec = spec.and((root, query, cb) ->
                    cb.like(cb.lower(root.get("code")), "%" + params.getCode().toLowerCase() + "%"));
        }

        if (params.getIsActive() != null) {
            spec = spec.and((root, query, cb) ->
                    cb.equal(root.get("isActive"), params.getIsActive()));
        }

        return warehouseRepository.findAll(spec, pageable).map(this::toView);
    }

    /**
     * Получить все склады (пагинация).
     */
    @Transactional(readOnly = true)
    public Page<WarehouseDto.View> findAll(Pageable pageable) {
        return warehouseRepository.findAll(pageable).map(this::toView);
    }

    /**
     * Получить склад по ID.
     */
    @Transactional(readOnly = true)
    public WarehouseDto.View findById(Long id) {
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Склад не найден: " + id));
        return toView(warehouse);
    }

    /**
     * Создать склад.
     */
    @Transactional
    public WarehouseDto.View create(WarehouseDto.Create dto, Long actorId) {
        Warehouse warehouse = Warehouse.builder()
                .name(dto.name())
                .code(dto.code())
                .address(dto.address())
                .isActive(dto.isActive() != null ? dto.isActive() : true)
                .build();

        warehouse = warehouseRepository.save(warehouse);

        // Аудит создания
        auditService.logById(actorId, "WAREHOUSE_CREATE", "Warehouse", warehouse.getId(), null, toView(warehouse));

        return toView(warehouse);
    }

    /**
     * Обновить склад.
     */
    @Transactional
    public WarehouseDto.View update(Long id, WarehouseDto.Update dto, Long actorId) {
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Склад не найден: " + id));

        WarehouseDto.View before = toView(warehouse);

        warehouse.setName(dto.name());
        warehouse.setCode(dto.code());
        warehouse.setAddress(dto.address());
        if (dto.isActive() != null) {
            warehouse.setIsActive(dto.isActive());
        }

        warehouse = warehouseRepository.save(warehouse);

        // Аудит обновления
        auditService.logById(actorId, "WAREHOUSE_UPDATE", "Warehouse", id, before, toView(warehouse));

        return toView(warehouse);
    }

    /**
     * Удалить склад.
     */
    @Transactional
    public void deleteById(Long id, Long actorId) {
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Склад не найден: " + id));

        WarehouseDto.View before = toView(warehouse);

        warehouseRepository.deleteById(id);

        // Аудит удаления
        auditService.logById(actorId, "WAREHOUSE_DELETE", "Warehouse", id, before, null);
    }

    private WarehouseDto.View toView(Warehouse w) {
        return new WarehouseDto.View(
                w.getId(),
                w.getName(),
                w.getCode(),
                w.getAddress(),
                w.getIsActive()
        );
    }
}
